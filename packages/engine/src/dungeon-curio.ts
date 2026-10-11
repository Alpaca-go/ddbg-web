import { curioCatalogSchema } from "../../data/src/curio";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { continueDungeonExploration } from "./dungeon-exploration";

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
  const d = state.dungeon!;
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
  return finish(
    state,
    {
      ...d,
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
}

/** 未核实行不执行半张卡。整卡预检成功后一次提交，已抽顶牌及 Torch 决定不可撤销重抽。 */
export function resolveDungeonCurio(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const c = d.curio;
  const active = c?.active;
  if (d.phase !== "awaitingCurio" || !c || !active) return refuse(state, "当前没有待结算的 Curio");
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
    r.effect && (!active.protected || r.effect.type === "gold") ? [r.effect] : [],
  );
  if (effects.some((e) => e.type === "drawDisease"))
    return block(
      "已核实获得疾病图标；完整疾病牌堆 / 施加接口尚未接线，未抽缩减牌堆，整卡效果尚未提交",
    );
  if (effects.some((e) => e.type === "status"))
    return block("Curio 状态图标已核实；英雄抗性 / 免疫资料未核齐（R-033、R-048），整卡尚未提交");
  const stress = effects.reduce((sum, e) => sum + (e.type === "stress" ? e.amount : 0), 0);
  if (hero.stress + stress >= 10)
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
  const dungeon: DungeonState = {
    ...d,
    gold,
    phase: "awaitingHazards",
    pending: null,
    heroes: d.heroes.map((h) => (h.id === hero.id ? { ...h, stress: h.stress + stress } : h)),
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
  return continueDungeonExploration(
    finish(
      state,
      dungeon,
      `${card.name} 已结算：${active.protected ? "Torch 忽略负面；" : ""}金币 +${gold - d.gold}；弃牌并续接剩余探索骰`,
    ),
  );
}
