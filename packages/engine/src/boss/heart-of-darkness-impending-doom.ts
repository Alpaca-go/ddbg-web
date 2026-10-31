import type { ApplyResult, GameEvent, GameState } from "../command";
import { rejectBattleCommand, type BattleState } from "../battle";
import { nextBattleRoll } from "../battle-roll";
import { readFinalFormSequence } from "./final-form-sequence";

/** boss_ability:p037 · Heart of Darkness 主体。 */
export const HEART_OF_DARKNESS_MONSTER_CARD_ID = "monster_large:p020" as const;

function heartOfDarknessActive(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "heartOfDarkness" && sequence.progress.status === "fighting";
}

function livingHeart(battle: BattleState) {
  return battle.entities.find(
    (entity) =>
      entity.side === "monster" &&
      !entity.dead &&
      entity.monsterCardId === HEART_OF_DARKNESS_MONSTER_CARD_ID,
  );
}

/** boss_ability:p037 + `monster_large:p020` 页脚 Stance/Skill Eligibility（R-139）。 */
export function impendingDoomSkillSlotFromDie(die: number): 1 | 2 | 3 | null {
  if (!Number.isInteger(die) || die < 1 || die > 10) return null;
  if (die <= 4) return 1;
  if (die <= 7) return 2;
  return 3;
}

export function impendingDoomSkillLabelFromDie(die: number): "Know This" | "Puncture" | "Dissolution" | null {
  const slot = impendingDoomSkillSlotFromDie(die);
  if (slot === 1) return "Know This";
  if (slot === 2) return "Puncture";
  if (slot === 3) return "Dissolution";
  return null;
}

function rollImpendingDoomDie(
  battle: BattleState,
  seed: number,
): { readonly battle: BattleState; readonly die: number; readonly events: readonly GameEvent[] } {
  const die = nextBattleRoll(seed, battle.rngCursor);
  return {
    die,
    battle: { ...battle, impendingDoomDie: die, rngCursor: battle.rngCursor + 1 },
    events: [
      {
        type: "dungeonUpdated",
        message: `Heart of Darkness · Impending Doom：落位 d10=${die}（boss_ability:p037；下回合按 R-139 映射选招）`,
      },
    ],
  };
}

/**
 * boss_ability:p037 首句：最终战 Heart 形态 `startBattle` 时掷 d10 落位。
 * 消费 `battle.rngCursor` 一次，先于第 1 轮先攻洗牌。
 */
export function applyHeartOfDarknessImpendingDoomOnBattleStart(state: GameState): ApplyResult {
  if (!heartOfDarknessActive(state)) return { state, events: [] };
  const battle = state.battle;
  if (!battle || battle.encounter) return { state, events: [] };
  if (!livingHeart(battle)) return { state, events: [] };
  const rolled = rollImpendingDoomDie(battle, state.seed);
  return { state: { ...state, battle: rolled.battle }, events: rolled.events };
}

function heartActorForRoll(
  state: GameState,
  actorId: string,
): { readonly battle: BattleState; readonly actorId: string } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!heartOfDarknessActive(state))
    return rejectBattleCommand(
      state,
      "Impending Doom 落骰仅适用于最终战 Heart of Darkness 形态（boss_ability:p037）",
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      "Impending Doom 须在 Heart of Darkness 怪物行动后落骰（boss_ability:p037）",
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== HEART_OF_DARKNESS_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Heart of Darkness 实体可落 Impending Doom 骰（R-048）");
  return { battle, actorId };
}

/**
 * 显式命令：Heart 结束一次行动后覆盖 `impendingDoomDie`（不执行对应技能、不代替 finishTurn）。
 * 常规怪物技能路径在 `finishTurn` 对 Heart 实体也会调用同等落骰。
 */
export function applyHeartOfDarknessImpendingDoomRoll(state: GameState, actorId: string): ApplyResult {
  const resolved = heartActorForRoll(state, actorId);
  if ("events" in resolved) return resolved;
  const rolled = rollImpendingDoomDie(resolved.battle, state.seed);
  return { state: { ...state, battle: rolled.battle }, events: rolled.events };
}

/** `finishTurn`：Heart 每次结束行动后覆盖落位骰（与显式命令共用 RNG 规则）。 */
export function bumpHeartOfDarknessImpendingDoomAfterAction(
  state: GameState,
  actorId: string,
): GameState {
  if (!heartOfDarknessActive(state)) return state;
  const battle = state.battle;
  if (!battle?.encounter) return state;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.dead ||
    actor.side !== "monster" ||
    actor.monsterCardId !== HEART_OF_DARKNESS_MONSTER_CARD_ID
  )
    return state;
  const rolled = rollImpendingDoomDie(battle, state.seed);
  return { ...state, battle: rolled.battle };
}

export type ApplyHeartOfDarknessImpendingDoomRollCommand = {
  readonly type: "applyHeartOfDarknessImpendingDoomRoll";
  readonly actorId: string;
};
