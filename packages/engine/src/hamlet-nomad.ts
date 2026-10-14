import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { currentHamletHero, finishHamletAction } from "./hamlet-actions";
import { buildingLevelsProblem, recoveryBuildingLevel } from "./hamlet-buildings";
import { trinketPoolProblem, trinketOptions, chooseTrinket } from "./trinket-acquisition";
import { createRng } from "./rng";

function problem(state: GameState) {
  const d = state.dungeon,
    h = d?.hamlet;
  return !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    h?.phase !== "heroActions" ||
    h.active ||
    !currentHamletHero(state) ||
    d.heroes.length !== 4 ||
    d.heroes.some(
      (hero) =>
        hero.dead || !Number.isSafeInteger(hero.stress) || hero.stress < 0 || hero.stress > 9,
    ) ||
    !h.preparationDays ||
    (h.remainingDays ?? h.preparationDays) < 1 ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 13) ||
    !d.trinkets ||
    d.trinkets.level !== 1 ||
    recoveryBuildingLevel(d, "nomadWagon") !== 1
    ? "当前只接完成回村后的游商马车I级陈列与购买；请按当天顺序行动（R33）"
    : (buildingLevelsProblem(d) ?? trinketPoolProblem(d.trinkets, d.heroes));
}
function shopping(state: GameState): ApplyResult {
  const d = state.dungeon!,
    pool = d.trinkets!,
    actor = currentHamletHero(state)!;
  const options = pool.incoming
    ? trinketOptions(pool, d.heroes).map(({ id, label }) => ({ id, label }))
    : [
        ...(pool.display ?? [])
          .filter(
            (id) => d.gold >= 4 && !pool.cards.find((c) => c.id === id)!.verification.unverified,
          )
          .map((id) => ({
            id: `buy:${id}`,
            label: `购买 ${pool.cards.find((c) => c.id === id)!.name}（4 金）`,
          })),
        { id: "leave", label: "结束游商访问，不购买" },
      ];
  const pending = {
    id: `hamlet-nomad:${pool.incoming ? "equip" : "shop"}:${d.decision}`,
    actorId: actor.id,
    prompt: pool.incoming
      ? "游商购买已付款：选择装备、转交或弃置，不重复收费（R26）"
      : "游商马车I：可购买一件陈列饰品；出售继续开发（R33）",
    options,
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}
/** R33：本次村庄首次来访陈列三件I级饰品；完整14张牌池保留，未核实卡不筛掉。 */
export function visitNomadWagon(state: GameState, actorId: string): ApplyResult {
  const reason = problem(state),
    d = state.dungeon,
    h = d?.hamlet;
  if (
    reason ||
    !d ||
    !h ||
    d.pending ||
    d.trinkets!.incoming ||
    currentHamletHero(state)!.id !== actorId ||
    h.blockedBuildings.includes("nomadWagon") ||
    h.visitedBuildings?.includes("nomadWagon")
  )
    return rejectBattleCommand(state, reason ?? "游商已封锁/占用、有待选或不是当前英雄");
  const pool = d.trinkets!;
  let cursor = d.cursor,
    nextPool = pool;
  if (pool.display === undefined) {
    const deck = [
      ...(pool.deck ??
        pool.cards
          .map((c) => c.id)
          .filter((id) => !pool.discard.includes(id) && !pool.held.some((c) => c.cardId === id))),
    ];
    if (deck.length < 3)
      return rejectBattleCommand(state, "饰品牌堆不足三张，陈列耗尽规则尚待确认（Q-80）；不补弃牌");
    if (pool.deck === null) {
      const rng = createRng(state.seed);
      for (let i = 0; i < cursor; i++) rng.next();
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
        cursor++;
      }
    }
    nextPool = { ...pool, display: deck.splice(0, 3), deck };
  }
  return shopping({
    ...state,
    dungeon: {
      ...d,
      cursor,
      trinkets: nextPool,
      hamlet: { ...h, visitedBuildings: [...(h.visitedBuildings ?? []), "nomadWagon"] },
    },
  });
}
/** 一个访问最多买一件。付款后沿R26获得饰品选择，完成装备/弃置后才推进当前英雄。 */
export function chooseNomadWagon(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const reason = problem(state),
    d = state.dungeon,
    p = d?.pending;
  if (
    reason ||
    !d ||
    !p ||
    p.id !== choiceId ||
    !p.id.startsWith("hamlet-nomad:") ||
    p.actorId !== currentHamletHero(state)!.id ||
    !p.options.some((o) => o.id === optionId) ||
    !d.hamlet!.visitedBuildings?.includes("nomadWagon")
  )
    return rejectBattleCommand(state, reason ?? "请完成当前游商访问的有效选择");
  const pool = d.trinkets!,
    actorId = p.actorId!;
  if (!Array.isArray(pool.display)) return rejectBattleCommand(state, "游商陈列状态缺失");
  if (pool.incoming) {
    if (!p.id.startsWith("hamlet-nomad:equip:") || pool.incoming.actorId !== actorId)
      return rejectBattleCommand(state, "游商装备选择阶段不一致");
    const applied = chooseTrinket(pool, d.heroes, optionId);
    if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
    const next = { ...state, dungeon: { ...d, trinkets: applied.pool, pending: null } };
    return applied.pool.incoming ? shopping(next) : finish(next, actorId);
  }
  if (!p.id.startsWith("hamlet-nomad:shop:")) return rejectBattleCommand(state, "游商购买阶段无效");
  if (optionId === "leave") return finish({ ...state, dungeon: { ...d, pending: null } }, actorId);
  const cardId = optionId.slice(4),
    card = pool.cards.find((c) => c.id === cardId);
  if (
    !optionId.startsWith("buy:") ||
    !pool.display?.includes(cardId) ||
    !card ||
    card.verification.unverified ||
    d.gold < 4
  )
    return rejectBattleCommand(state, "陈列饰品未核实、不在售或金币不足，未付款");
  return shopping({
    ...state,
    dungeon: {
      ...d,
      gold: d.gold - 4,
      pending: null,
      trinkets: {
        ...pool,
        display: pool.display.filter((id) => id !== cardId),
        incoming: { cardId, actorId },
      },
    },
  });
}
function finish(state: GameState, actorId: string): ApplyResult {
  return {
    state: { ...state, dungeon: finishHamletAction(state.dungeon!, actorId, false) },
    events: [
      {
        type: "dungeonUpdated",
        message: `${actorId}游商访问完成；本次访问至多购买一件，陈列保持到离村（R26/33）`,
      },
    ],
  };
}
