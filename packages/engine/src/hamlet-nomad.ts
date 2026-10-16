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
    (h.nomadSold !== undefined && h.nomadSold !== true) ||
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
    actor = currentHamletHero(state)!,
    price = saleGold(state);
  const options = pool.incoming
    ? trinketOptions(pool, d.heroes).map(({ id, label }) => ({ id, label }))
    : [
        ...(!d.hamlet!.nomadSold && Number.isSafeInteger(d.gold + price)
          ? pool.held
              .filter((held) => held.heroId === actor.id)
              .map((held) => ({
                id: `sell:${held.cardId}`,
                label: `出售 ${pool.cards.find((c) => c.id === held.cardId)!.name}（获得${price}金，立即洗回牌堆）`,
              }))
          : []),
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
      : "游商马车I：可先出售一件已装备饰品，再购买一件陈列品（R33、R-078）",
    options,
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}
/** Gypsy Trail p9 / R-085：本次村庄出售加5金；离村后hamlet不再保留，不继承加价。 */
function saleGold(state: GameState) {
  return state.dungeon!.hamlet!.last === "hamlet_event:p009" ? 7 : 2;
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
    h.nomadSold ||
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
  if (optionId.startsWith("sell:")) {
    const cardId = optionId.slice(5),
      price = saleGold(state);
    if (
      d.hamlet!.nomadSold ||
      !Number.isSafeInteger(d.gold + price) ||
      !pool.held.some((held) => held.cardId === cardId && held.heroId === actorId)
    )
      return rejectBattleCommand(state, "一次游商访问至多出售自己的一件已装备饰品（R33）");
    // R-078：只洗当前牌堆及售出卡；陈列、弃牌、其他持牌不参与。
    const held = pool.held.filter((item) => item.cardId !== cardId);
    const deck = [
      ...(pool.deck ??
        pool.cards
          .map((c) => c.id)
          .filter(
            (id) =>
              !pool.discard.includes(id) &&
              !pool.held.some((h) => h.cardId === id) &&
              !pool.display!.includes(id),
          )),
      cardId,
    ];
    const rng = createRng(state.seed);
    let cursor = d.cursor;
    for (let i = 0; i < cursor; i++) rng.next();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
    const next = shopping({
      ...state,
      dungeon: {
        ...d,
        gold: d.gold + price,
        cursor,
        pending: null,
        trinkets: { ...pool, deck, held },
        hamlet: { ...d.hamlet!, nomadSold: true },
      },
    });
    return {
      ...next,
      events: [
        {
          type: "dungeonUpdated",
          message: `${actorId}出售${pool.cards.find((c) => c.id === cardId)!.name}获得${price}金${price === 7 ? "（Gypsy Trail加5金，R-085）" : ""}，立即洗回I级牌堆；可继续购买，尚未结束行动（R33、R-078）`,
        },
        ...next.events,
      ],
    };
  }
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
  const hamlet = { ...state.dungeon!.hamlet! };
  delete hamlet.nomadSold;
  return {
    state: { ...state, dungeon: finishHamletAction({ ...state.dungeon!, hamlet }, actorId, false) },
    events: [
      {
        type: "dungeonUpdated",
        message: `${actorId}游商访问完成；本次访问至多购买一件，陈列保持到离村（R26/33）`,
      },
    ],
  };
}
