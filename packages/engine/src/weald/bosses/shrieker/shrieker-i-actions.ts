import { readShriekerRuntimeContext } from "./shrieker-runtime-context";
import type { BattleEntity, BattleState } from "../../../shared/battle/battle";
import type { GameState } from "../../../shared/core/command";
import type { SkillTargetSide } from "../../../core/heroes/hero-skill";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";

export function shriekerICombatActive(state: GameState): boolean {
  const d = state.dungeon,
    b = state.battle;
  return (
    !!b &&
    !b.shriekerISetupHold &&
    !!readShriekerRuntimeContext(state) &&
    d?.contentPacks?.includes("weald") === true &&
    d?.roomCards?.active?.tileId === content.tile.id
  );
}

export function shriekerINestHasNoInitiative(state: GameState, entity: BattleEntity): boolean {
  return (
    shriekerICombatActive(state) &&
    entity.side === "monster" &&
    entity.monsterCardId === readShriekerRuntimeContext(state)!.faces[1].rawId
  );
}

/** W3／R-261：本体三张先攻；Nest 不另占先攻或主动回合。 */
export function expandShriekerIInitiative(
  deck: readonly SkillTargetSide[],
  battle: BattleState,
  state: GameState,
): SkillTargetSide[] {
  if (!shriekerICombatActive(state)) return [...deck];
  const boss = battle.entities.find(
    (e) =>
      e.side === "monster" &&
      !e.dead &&
      e.monsterCardId === readShriekerRuntimeContext(state)!.faces[0].rawId,
  );
  return boss ? [...deck, "monster", "monster"] : [...deck];
}

export function bumpShriekerIActionCount(state: GameState, actorId: string): GameState {
  if (
    !shriekerICombatActive(state) ||
    !state.battle!.entities.some(
      (e) =>
        e.id === actorId && e.monsterCardId === readShriekerRuntimeContext(state)!.faces[0].rawId,
    )
  )
    return state;
  return {
    ...state,
    battle: {
      ...state.battle!,
      shriekerActionsThisRound: (state.battle!.shriekerActionsThisRound ?? 0) + 1,
    },
  };
}

export function shriekerIActionQuotaReached(state: GameState, actorId: string): boolean {
  if (
    !shriekerICombatActive(state) ||
    !state.battle!.entities.some(
      (e) =>
        e.id === actorId && e.monsterCardId === readShriekerRuntimeContext(state)!.faces[0].rawId,
    )
  )
    return true;
  return (state.battle!.shriekerActionsThisRound ?? 0) >= content.abilities.actionsPerRound;
}
