import { curioCatalogSchema } from "../../data/src/curio";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { continueDungeonExploration } from "./dungeon-exploration";
import { replaceConditionQuirk } from "./conditions";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";
import type { ProvisionFace } from "./loot";
import { chooseTrinket } from "./trinket-acquisition";
import { resolveCurioRows as resolveDungeonCurio } from "./dungeon-curio-effects";
export { resolveDungeonCurio };

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
  const roomSource = d.curioRoom;
  const fromRoom =
    d.phase === "awaitingRoom" &&
    roomSource?.roomId === d.position &&
    roomSource.stage === "reward" &&
    rollId === `room-curio:${d.position}`;
  const roll = d.exploration?.rolls?.find(
    (r) => r.id === rollId && !r.resolved && r.face === "curio",
  );
  if (
    (!fromRoom && (!roll || d.phase !== "awaitingHazards")) ||
    !c ||
    !curioCatalogSchema.safeParse(c.cards).success ||
    c.active
  )
    return refuse(state, "需要完整 24 张 Curio 与有效探索停点（R-048）；未抽牌、未消费 Torch");
  const heroId = fromRoom ? "" : roll?.heroId;
  if (!fromRoom && (!heroId || !d.heroes.some((h) => h.id === heroId && !h.dead)))
    return refuse(state, "Curio 处理英雄无效；未抽牌或消耗 Torch");
  const available = [...(c.deck ?? c.cards.map((card) => card.id)), ...c.discard];
  if (
    available.length !== 24 ||
    new Set(available).size !== 24 ||
    available.some((id) => !c.cards.some((card) => card.id === id))
  )
    return refuse(state, "Curio 牌池不守恒，拒绝缩减牌堆（R-048）");
  if (c.deck?.length === 0)
    return refuse(state, "Curio 已抽空；本次地牢不洗回弃牌，未消费 Torch（R-068；回村洗回见 R32）");
  const protectedCard = optionId.startsWith("use:");
  const tokenId = optionId.slice(4);
  if (
    protectedCard
      ? !d.explorationSetup?.provisions.some((p) => p.id === tokenId && p.face === "torch")
      : optionId !== "draw"
  )
    return refuse(state, "必须在抽卡前选择使用 Torch 或直接抽牌");
  const beforeEvents: import("./command").GameEvent[] = [];
  if (!fromRoom && !d.pendingCurioDraw) {
    const passive = triggerDungeonPassive(d, state.seed, [heroId!], "beforeCurio");
    if (passive.status === "refused") return refuse(state, passive.reason);
    d = passive.dungeon;
    beforeEvents.push(...passive.events);
    if (d.heroes.some((h) => h.dead)) {
      const stopped = finish(
        state,
        { ...d, phase: "awaitingReplacement", pending: null, replacementResume: "exploration" },
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
          pressureSource: fromRoom ? "curioRoom" : "exploration",
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
      ...(fromRoom ? { curioRoom: { ...roomSource!, stage: "drawing" } } : {}),
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
        active: {
          cardId,
          heroId: heroId!,
          rollId,
          protected: protectedCard,
          ...(fromRoom ? { roomId: d.position } : {}),
        },
      },
    },
    `${fromRoom ? "房间 Curio" : heroId} ${protectedCard ? `先弃 ${tokenId}，忽略已核实负面效果；` : "未用 Torch；"}抽到 ${cardId} ${card.name}（印刷 p${card.source.page}）`,
  );
  if (fromRoom) {
    const pending = {
      id: `dungeon-room-curio-hero:${d.decision}`,
      prompt: "选择处理已揭示房间 Curio 的英雄（R15）",
      options: d.heroes.filter((h) => !h.dead).map((h) => ({ id: h.id, label: h.id })),
    };
    return {
      ...drawn,
      state: {
        ...drawn.state,
        dungeon: { ...drawn.state.dungeon!, pending, decision: d.decision + 1 },
      },
      events: [...beforeEvents, ...drawn.events],
      pendingChoice: pending,
    };
  }
  return { ...drawn, events: [...beforeEvents, ...drawn.events] };
}

/** R12 / R18：Wild 的决定沿用已掷骰，整卡奖励在选择完成后提交一次。 */
export function resolveDungeonCurioProvisionChoice(
  state: GameState,
  face: ProvisionFace,
): ApplyResult {
  const d = state.dungeon!;
  if (d.phase !== "awaitingCurio" || d.curio?.active?.provisionFace !== "wild")
    return refuse(state, "当前没有 Curio Wild 待选决定");
  return resolveDungeonCurio({
    ...state,
    dungeon: {
      ...d,
      pending: null,
      curio: { ...d.curio, active: { ...d.curio.active, provisionFace: face } },
    },
  });
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

export function resolveDungeonTrinketChoice(state: GameState, optionId: string): ApplyResult {
  const d = state.dungeon!;
  if (!d.trinkets || d.phase !== "awaitingCurio" || !d.curio?.active?.trinketApplied)
    return refuse(state, "当前没有 Curio 饰品待选");
  const chosen = chooseTrinket(d.trinkets, d.heroes, optionId);
  if (chosen.status === "refused") return refuse(state, chosen.reason);
  return resolveDungeonCurio({ ...state, dungeon: { ...d, trinkets: chosen.pool, pending: null } });
}
