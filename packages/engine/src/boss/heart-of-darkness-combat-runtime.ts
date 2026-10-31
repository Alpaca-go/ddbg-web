import type { ApplyResult, GameState } from "../command";
import { HEART_OF_DARKNESS_MONSTER_CARD_ID } from "./heart-of-darkness-impending-doom";
import { readFinalFormSequence } from "./final-form-sequence";
import { applyHeartOfDarknessImpendingDoomSkill } from "./heart-of-darkness-skills-acc";

function heartOfDarknessFighting(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "heartOfDarkness" && sequence.progress.status === "fighting";
}

/**
 * Heart 怪物回合不走路径姿态骰表；Impending Doom 落位骰（R-139）为唯一选招来源。
 * 无骰/非法面值由 `applyHeartOfDarknessImpendingDoomSkill` 拒绝，与显式命令一致。
 */
export function heartOfDarknessImpendingDoomShouldReplaceSkill(
  state: GameState,
  actorId: string,
): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;
  if (!heartOfDarknessFighting(state)) return false;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== HEART_OF_DARKNESS_MONSTER_CARD_ID
  ) {
    return false;
  }
  return true;
}

/** encounter · `prepareMonsterAction` 路径：Impending Doom 映射 + #456 Acc。 */
export function applyHeartOfDarknessImpendingDoomFromEncounter(
  state: GameState,
  actorId: string,
): ApplyResult {
  return applyHeartOfDarknessImpendingDoomSkill(state, actorId);
}
