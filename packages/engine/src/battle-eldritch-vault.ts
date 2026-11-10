import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import trinketFile from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import { drawTrinketAtLevel } from "./trinket-acquisition";
import { openBattleTrinketChoice, payRoomTrinketCost } from "./battle-trinket";
import { endAfterCasualties, finishTurn } from "./encounter";

const trinketCatalog = () => normalizedTrinketFileSchema.parse(trinketFile).cards;

const heroesInPlay = (state: GameState) => {
  const battle = state.battle!;
  return battle.entities
    .filter((e) => e.side === "hero")
    .map((e) => ({
      id: e.id,
      dead: e.dead,
      ...(e.heroLevel === undefined ? {} : { level: e.heroLevel }),
    }));
};

function canInteract(state: GameState, actorId: string) {
  const b = state.battle,
    t = b?.encounter?.turn;
  const actor = b?.entities.find((e) => e.id === actorId);
  return !!(
    state.dungeon?.phase === "inBattle" &&
    b &&
    t?.type === "hero" &&
    t.actorId === actorId &&
    t.actions >= 2 &&
    !t.mustMove &&
    actor?.side === "hero" &&
    !actor.dead &&
    b.areas.find((a) => a.id === actor.areaId)?.eldritchVaultTrinkets &&
    !b.pending &&
    !b.shuffleIntents.length &&
    !b.shuffleContinuation
  );
}

/** R-156：E 区花 2 行动，按在场英雄数各抽 1 张 III 级饰品；装备承受压力 +2（Q-140 待确认：其余抽牌处置顺序）。 */
export function beginEldritchVault(state: GameState, actorId: string): ApplyResult {
  if (!canInteract(state, actorId))
    return rejectBattleCommand(
      state,
      "Eldritch Vault 需要当前英雄位于 E 区、有 2 行动且无待选或强制移动",
    );
  const original = state.battle!;
  if (
    !original.trinkets ||
    (state.dungeon && original.trinkets.level !== state.dungeon.explorationSetup?.dungeonLevel)
  )
    return rejectBattleCommand(state, "缺少本地牢等级的完整饰品牌池（R26/R35、R-048）");
  const heroCount = original.entities.filter((e) => e.side === "hero" && !e.dead).length;
  if (!heroCount)
    return rejectBattleCommand(state, "没有在场英雄，无法按人数抽 III 级饰品（R-156）");
  const actor = original.entities.find((e) => e.id === actorId)!;
  const prepaid = original.areas.some((a) => a.id === actor.areaId && a.eldritchVaultPayBeforeDraw);
  const paid = prepaid
    ? payRoomTrinketCost(state, actorId, heroCount, "Eldritch Vault")
    : { state, events: [] };
  if (paid.events.some((event) => event.type === "commandRefused")) return paid;
  const b = paid.state.battle!;
  if (b.entities.find((e) => e.id === actorId)!.dead)
    return endAfterCasualties(paid) ?? finishTurn(paid.state, actorId, paid.events);
  const drawn = drawTrinketAtLevel(
    b.trinkets!,
    heroesInPlay(paid.state),
    actorId,
    3,
    state.seed,
    b.rngCursor,
    trinketCatalog(),
  );
  if (drawn.status === "refused") return rejectBattleCommand(state, drawn.reason);
  const deck =
    drawn.pool.level === 3
      ? drawn.pool.deck
      : drawn.pool.inactive?.find((p) => p.level === 3)?.deck;
  if (prepaid && (deck?.length ?? 0) < heroCount - 1)
    return rejectBattleCommand(state, "III 级饰品牌堆不足以为在场英雄各抽一张（R32）");
  const turn = b.encounter!.turn;
  if (turn.type !== "hero") return rejectBattleCommand(state, "Vault需要当前英雄回合");
  return openBattleTrinketChoice(
    {
      ...paid.state,
      battle: {
        ...b,
        trinkets: drawn.pool,
        rngCursor: drawn.cursor,
        eldritchVaultDrawsRemaining: heroCount - 1,
        eldritchVaultReward: true,
        ...(prepaid ? {} : { eldritchVaultStress: heroCount }),
        encounter: {
          ...b.encounter!,
          turn: { ...turn, actions: prepaid ? turn.actions : turn.actions - 2 },
        },
      },
    },
    actorId,
    `Eldritch Vault：按 ${heroCount} 名在场英雄各抽 1 张 III 级饰品；${prepaid ? "已支付" : "使用承受"}压力 +${heroCount}，装备再 +2`,
    [
      ...paid.events,
      {
        type: "roomInteractionResolved",
        actorId,
        message: `Eldritch Vault：花 2 行动，开始处理 ${heroCount} 张 III 级饰品（R-156）`,
      },
    ],
  );
}

export function drawNextEldritchVaultTrinket(state: GameState, actorId: string): ApplyResult {
  const b = state.battle!;
  const remaining = b.eldritchVaultDrawsRemaining ?? 0;
  if (!remaining || !b.eldritchVaultReward)
    return {
      state: clearEldritchVaultReward(state),
      events: [],
    };
  if (
    b.areas.some((area) => area.eldritchVaultPayBeforeDraw) &&
    b.entities.find((e) => e.id === actorId)?.dead
  ) {
    const survivor = b.entities.find((e) => e.side === "hero" && !e.dead);
    if (survivor) actorId = survivor.id;
  }
  const drawn = drawTrinketAtLevel(
    b.trinkets!,
    heroesInPlay(state),
    actorId,
    3,
    state.seed,
    b.rngCursor,
    trinketCatalog(),
  );
  if (drawn.status === "refused") return rejectBattleCommand(state, drawn.reason);
  return openBattleTrinketChoice(
    {
      ...state,
      battle: {
        ...b,
        trinkets: drawn.pool,
        rngCursor: drawn.cursor,
        eldritchVaultDrawsRemaining: remaining - 1,
      },
    },
    actorId,
    `Eldritch Vault：继续处理抽到的 III 级饰品（剩余 ${remaining} 张）；装备承受压力 +2`,
    [],
  );
}

export function clearEldritchVaultReward(state: GameState): GameState {
  if (!state.battle) return state;
  const { eldritchVaultDrawsRemaining, eldritchVaultReward, eldritchVaultStress, ...battle } =
    state.battle;
  if (
    eldritchVaultDrawsRemaining === undefined &&
    eldritchVaultReward === undefined &&
    eldritchVaultStress === undefined
  )
    return state;
  return { ...state, battle };
}
