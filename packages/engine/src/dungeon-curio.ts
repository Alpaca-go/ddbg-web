import { curioCatalogSchema, isNegativeCurioEffect } from "../../data/src/curio";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { continueDungeonExploration } from "./dungeon-exploration";
import { gainDisease, replaceConditionQuirk } from "./conditions";
import { readHeroPassiveDefence } from "./battle-skill-status";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { passiveStress } from "./passive";
import { applyPassiveStatus } from "./passive-runtime";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});
const finish = (state: GameState, dungeon: DungeonState, message: string): ApplyResult => ({
  state: { ...state, dungeon },
  events: [{ type: "dungeonUpdated", message }],
});

/** R10 / R12 / R14：完整牌池只洗一次；Torch 先弃，随后才揭示顶牌，抽空不擅自洗回。 */
export function drawDungeonCurio(state: GameState, rollId: string, optionId: string): ApplyResult {
  let d = state.dungeon!;
  const c = d.curio;
  const roll = d.exploration?.rolls?.find(
    (r) => r.id === rollId && !r.resolved && r.face === "curio",
  );
  if (
    !roll ||
    d.phase !== "awaitingHazards" ||
    !c ||
    !curioCatalogSchema.safeParse(c.cards).success ||
    c.active
  )
    return refuse(state, "需要完整 24 张 Curio 与有效探索停点（R-048）；未抽牌、未消费 Torch");
  const available = [...(c.deck ?? c.cards.map((card) => card.id)), ...c.discard];
  if (
    available.length !== 24 ||
    new Set(available).size !== 24 ||
    available.some((id) => !c.cards.some((card) => card.id === id))
  )
    return refuse(state, "Curio 牌池不守恒，拒绝缩减牌堆（R-048）");
  if (c.deck?.length === 0)
    return refuse(state, "Curio 已抽空；Q-61 待确认，未自动洗回弃牌，也未消费 Torch");
  const protectedCard = optionId.startsWith("use:");
  const tokenId = optionId.slice(4);
  if (
    protectedCard
      ? !d.explorationSetup?.provisions.some((p) => p.id === tokenId && p.face === "torch")
      : optionId !== "draw"
  )
    return refuse(state, "必须在抽卡前选择使用 Torch 或直接抽牌");
  const beforeEvents: import("./command").GameEvent[] = [];
  if (!d.pendingCurioDraw) {
    const passive = triggerDungeonPassive(d, state.seed, [roll.heroId], "beforeCurio");
    if (passive.status === "refused") return refuse(state, passive.reason);
    d = passive.dungeon;
    beforeEvents.push(...passive.events);
    if (d.heroes.some((h) => h.dead)) {
      const stopped = finish(
        state,
        { ...d, phase: "awaitingReplacement", pending: null },
        "Curio 交互前被动导致死亡，未抽卡、未扣 Torch",
      );
      return { ...stopped, events: [...beforeEvents, ...stopped.events] };
    }
    if (d.heroes.some((h) => h.stress === 10)) {
      const pressure = resolveDungeonPressure({
        ...state,
        dungeon: {
          ...d,
          phase: "blockedPressure",
          pressureSource: "exploration",
          pending: null,
          pendingCurioDraw: { rollId, optionId },
        },
      });
      const continued = continueDungeonExploration(pressure);
      return { ...continued, events: [...beforeEvents, ...continued.events] };
    }
  }
  const deck = [...(c.deck ?? c.cards.map((card) => card.id))];
  let cursor = d.cursor;
  if (c.deck === null) {
    const rng = createRng(state.seed);
    for (let i = 0; i < cursor; i++) rng.next();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
  }
  const cardId = deck.shift()!;
  const card = c.cards.find((card) => card.id === cardId)!;
  const { pendingCurioDraw: _pendingDraw, ...ready } = d;
  void _pendingDraw;
  const drawn = finish(
    state,
    {
      ...ready,
      cursor,
      phase: "awaitingCurio",
      pending: null,
      ...(protectedCard
        ? {
            explorationSetup: {
              ...d.explorationSetup!,
              provisions: d.explorationSetup!.provisions.filter((p) => p.id !== tokenId),
            },
          }
        : {}),
      curio: {
        ...c,
        deck,
        active: { cardId, heroId: roll.heroId, rollId, protected: protectedCard },
      },
    },
    `${roll.heroId} ${protectedCard ? `先弃 ${tokenId}，忽略已核实负面效果；` : "未用 Torch；"}抽到 ${cardId} ${card.name}（印刷 p${card.source.page}）`,
  );
  return { ...drawn, events: [...beforeEvents, ...drawn.events] };
}

/** 未核实行不执行半张卡。整卡预检成功后一次提交，已抽顶牌及 Torch 决定不可撤销重抽。 */
export function resolveDungeonCurio(state: GameState): ApplyResult {
  let d = state.dungeon!;
  const c = d.curio;
  const active = c?.active;
  if (d.phase !== "awaitingCurio" || !c || !active) return refuse(state, "当前没有待结算的 Curio");
  if (d.pending) return refuse(state, "请先完成疾病的怪癖替换选择");
  const block = (reason: string) =>
    finish(state, { ...d, curio: { ...c, active: { ...active, blockedReason: reason } } }, reason);
  if (!curioCatalogSchema.safeParse(c.cards).success)
    return block("Curio 完整资料无效（R-048），保持已抽卡");
  const held = [...(c.deck ?? []), ...c.discard, active.cardId];
  if (
    held.length !== 24 ||
    new Set(held).size !== 24 ||
    held.some((id) => !c.cards.some((card) => card.id === id))
  )
    return block("Curio 牌池不守恒，保持已抽卡");
  const card = c.cards.find((card) => card.id === active.cardId);
  const hero = d.heroes.find((h) => h.id === active.heroId);
  if (
    !card ||
    !hero ||
    hero.dead ||
    !d.exploration?.rolls?.some(
      (r) =>
        r.id === active.rollId && r.heroId === active.heroId && r.face === "curio" && !r.resolved,
    )
  )
    return block("Curio 与英雄 / 未完成骰面不一致，保持停点");
  const unknown = card.rows.filter((r) => r.effect === null);
  if (unknown.length)
    return block(
      `${card.id} p${card.source.page} 待确认：${unknown.map((r) => `${r.printed}（${r.reason}）`).join("；")}；未结算任何效果，不把未知行判作负面或装饰`,
    );
  const effects = card.rows.flatMap((r) =>
    r.effect && (!active.protected || !isNegativeCurioEffect(r.effect)) ? [r.effect] : [],
  );
  const unsupportedReward = effects.find(
    (e) => e.type === "drawQuirk" || e.type === "drawTrinket" || e.type === "rollProvision",
  );
  if (unsupportedReward)
    return block(
      `图标已按 R-064 确认；Curio ${unsupportedReward.type} 奖惩接口尚未接线，整卡尚未提交`,
    );
  if (
    effects.some((e) => e.type === "drawDisease") &&
    (!d.conditions || !d.battleCatalog || !readHeroPassiveDefence(d.battleCatalog, hero))
  )
    return block(
      "已核实获得疾病图标；完整疾病牌堆 / 施加接口尚未接线，未抽缩减牌堆，整卡效果尚未提交",
    );
  if (
    effects.some((e) => e.type === "drawDisease") &&
    effects.some((e) => e.type === "status" || e.type === "stress")
  )
    return block("Curio 同卡疾病与压力 / 状态的触发先后待 Q-68 确认，整卡尚未提交");
  if (effects.some((e) => e.type === "status" && e.kind !== "buff"))
    return block("Curio 状态与同卡其他效果的事件续接尚未接线，整卡尚未提交");
  if (
    effects.some((e) => e.type === "status" && e.kind === "buff") &&
    (!d.battleCatalog || !readHeroPassiveDefence(d.battleCatalog, hero))
  )
    return block("Curio Buff 需要获批完整英雄抗性 / 免疫（R21、R-048），整卡尚未提交");
  const stress = effects.reduce((sum, e) => sum + (e.type === "stress" ? e.amount : 0), 0);
  if (hero.stress + passiveStress(hero, stress, d.explorationSetup?.light ?? 5).amount >= 10)
    return block("Curio 压力到 10 与同卡其他效果的收尾顺序待 Q-62 确认，整卡尚未提交");
  if (
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    !Number.isInteger(hero.stress) ||
    hero.stress < 0 ||
    hero.stress > 9
  )
    return block("金币 / 压力数据无效（R-048）");
  let gold = d.gold;
  for (const effect of effects) {
    if (effect.type === "gold") gold += effect.amount;
  }
  if (!Number.isSafeInteger(gold)) return block("金币超出安全范围");
  const passiveEvents: import("./command").GameEvent[] = [];
  const infectionCount = effects.filter((e) => e.type === "drawDisease").length;
  for (
    let appliedCount = active.diseasesApplied ?? 0;
    appliedCount < infectionCount;
    appliedCount++
  ) {
    const acquired = gainDisease(d.conditions!, d.heroes, hero.id, state.seed, d.cursor);
    if (acquired.status === "refused") return block(acquired.reason);
    d = {
      ...d,
      heroes: acquired.heroes,
      cursor: acquired.cursor,
      conditions: acquired.pool,
      curio: { ...d.curio!, active: { ...active, diseasesApplied: appliedCount + 1 } },
    };
    passiveEvents.push({
      type: "diseaseAcquired",
      entityId: hero.id,
      diseaseId: acquired.diseaseId,
      ...(acquired.quirkId ? { quirkId: acquired.quirkId } : {}),
      message: "Curio 获得疾病；重复感染按 R26–27 抽负面怪癖",
    });
    if (acquired.replaceOptions?.length) {
      const choice = {
        id: `dungeon-condition:${d.decision}:${hero.id}`,
        actorId: hero.id,
        prompt: "选择被新负面怪癖替换的已有正面怪癖",
        options: acquired.replaceOptions.map((id) => ({
          id,
          label: acquired.pool.quirks.find((q) => q.id === id)!.name,
        })),
      };
      return {
        state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
        events: passiveEvents,
        pendingChoice: choice,
      };
    }
  }
  const paid = triggerDungeonPassive(d, state.seed, [hero.id], { type: "stress", amount: stress });
  if (paid.status === "refused") return refuse(state, paid.reason);
  d = paid.dungeon;
  passiveEvents.push(...paid.events);
  for (const effect of effects) {
    if (effect.type !== "status" || effect.kind !== "buff") continue;
    const holder = d.heroes.find((h) => h.id === hero.id)!;
    const buff = applyPassiveStatus(
      holder,
      { kind: "buff", duration: effect.duration },
      "target",
      readHeroPassiveDefence(d.battleCatalog!, holder),
    );
    if (buff.status === "refused") return refuse(state, buff.reason);
    d = { ...d, heroes: d.heroes.map((h) => (h.id === hero.id ? buff.hero : h)) };
    passiveEvents.push({
      type: "dungeonUpdated",
      message: `${hero.id} Curio：Buff ${effect.duration}t（R21）`,
    });
  }
  const dungeon: DungeonState = {
    ...d,
    gold,
    phase: "awaitingHazards",
    pending: null,
    exploration: {
      ...d.exploration!,
      rolls: d.exploration!.rolls!.map((r) =>
        r.id === active.rollId ? { ...r, resolved: true } : r,
      ),
    },
    curio: {
      ...c,
      active: null,
      last: {
        cardId: active.cardId,
        heroId: active.heroId,
        rollId: active.rollId,
        protected: active.protected,
      },
      discard: [...c.discard, card.id],
    },
  };
  const continued = continueDungeonExploration(
    finish(
      state,
      dungeon,
      `${card.name} 已结算：${active.protected ? "Torch 忽略负面；" : ""}金币 +${gold - d.gold}；弃牌并续接剩余探索骰`,
    ),
  );
  return { ...continued, events: [...passiveEvents, ...continued.events] };
}

export function resolveDungeonConditionChoice(state: GameState, optionId: string): ApplyResult {
  const d = state.dungeon!;
  if (!d.conditions) return refuse(state, "缺少疾病 / 怪癖池");
  const applied = replaceConditionQuirk(d.conditions, d.heroes, optionId);
  if (applied.status === "refused") return refuse(state, applied.reason);
  return resolveDungeonCurio({
    ...state,
    dungeon: { ...d, conditions: applied.pool, heroes: applied.heroes, pending: null },
  });
}
