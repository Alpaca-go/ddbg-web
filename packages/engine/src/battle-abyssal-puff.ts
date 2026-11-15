import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { isLivingCombatMonster, isNecroticFungusEntity } from "./expansions/weald/necrotic-fungus";
import { wealdMechanicsActive } from "./expansions/weald/weald-mechanics";

function active(state: GameState): boolean {
  return (
    wealdMechanicsActive(state) &&
    state.dungeon?.mode !== "stygian" &&
    state.dungeon?.roomCards?.active?.cardId === "room:weald:p008"
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
  const targets = battle.entities.filter(isLivingCombatMonster);
  const resolutions = destroyed.flatMap(() =>
    targets.map((target) => ({
      ...fixedDamageResolution(target, "room:abyssalPuff"),
      targetStatusEffects: [{ kind: "buff" as const, duration: 2 }],
    })),
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
        message: "Abyssal Puff：真菌被摧毁，房内所有怪物增益 2t（R-234、R-236、W-04）",
      })),
    ],
  };
}
