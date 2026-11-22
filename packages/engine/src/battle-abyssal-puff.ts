import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { isLivingCombatMonster, isNecroticFungusEntity } from "./expansions/weald/necrotic-fungus";
import { wealdMechanicsActive } from "./expansions/weald/weald-mechanics";
import { wealdOrdinaryRoomEffectActive, wealdStygianEffect } from "./weald-stygian-room-effects";

function active(state: GameState): boolean {
  return (
    wealdMechanicsActive(state) &&
    wealdOrdinaryRoomEffectActive(state, "room:weald:08", "abyssalPuff")
  );
}
export function enableAbyssalPuff(state: GameState): GameState {
  return active(state) ? { ...state, battle: { ...state.battle!, wealdAbyssalPuff: true } } : state;
}

/** R-234／R-236、W-04：每次命令中新摧毁的真菌分别触发；旧尸体不重放。 */
export function withAbyssalPuff(original: GameState, result: ApplyResult): ApplyResult {
  if (
    result.events.some((e) => e.type === "commandRefused") ||
    !original.battle?.wealdAbyssalPuff ||
    !active(original) ||
    !result.state.battle
  )
    return result;
  const battle = result.state.battle;
  const destroyed = battle.entities.filter(
    (e) =>
      e.dead &&
      isNecroticFungusEntity(e) &&
      original.battle!.entities.some(
        (before) => before.id === e.id && !before.dead && isNecroticFungusEntity(before),
      ),
  );
  if (!destroyed.length) return result;
  const stygian = wealdStygianEffect(original.dungeon, "abyssalPuff");
  const duration = stygian?.kind === "abyssalPuff" ? stygian.buffDuration : 2;
  const applications = stygian?.kind === "abyssalPuff" ? stygian.buffApplications : 1;
  const targets = battle.entities.filter(isLivingCombatMonster);
  const resolutions = destroyed.flatMap(() =>
    targets.flatMap((target) =>
      Array.from({ length: applications }, () => ({
        ...fixedDamageResolution(target, "room:abyssalPuff"),
        targetStatusEffects: [{ kind: "buff" as const, duration }],
      })),
    ),
  );
  const statuses = applyBattleSkillStatuses(
    battle,
    battle.entities,
    "",
    resolutions,
    original.seed,
    battle.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(original, statuses.reason);
  return {
    ...result,
    state: {
      ...result.state,
      battle: { ...battle, entities: statuses.entities, rngCursor: statuses.rngCursor },
    },
    events: [
      ...result.events,
      ...statuses.events,
      ...destroyed.map((fungus) => ({
        type: "passiveTriggered" as const,
        entityId: fungus.id,
        trigger: "abyssalPuff",
        message:
          applications === 1
            ? `Abyssal Puff：真菌被摧毁，房内所有怪物增益 ${duration}t（R-234、R-236、W-04）`
            : `Abyssal Puff：真菌被摧毁，房内所有怪物两项增益 ${duration}t（R-234、R-236、W-04）`,
      })),
    ],
  };
}
