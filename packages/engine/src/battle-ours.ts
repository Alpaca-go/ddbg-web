import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { isLivingCombatMonster } from "./expansions/weald/necrotic-fungus";
import { wealdMechanicsActive } from "./expansions/weald/weald-mechanics";

function active(state: GameState): boolean {
  return (
    wealdMechanicsActive(state) &&
    state.dungeon?.mode !== "stygian" &&
    state.dungeon?.roomCards?.active?.cardId === "room:weald:p009"
  );
}
export function enableOurs(state: GameState): GameState {
  return active(state) ? { ...state, battle: { ...state.battle!, wealdOurs: true } } : state;
}

/** R-234／R-238：每个成功拾取的宝箱分别触发，不限 B 区。 */
export function resolveOurs(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult {
  if (!state.battle?.wealdOurs || !active(state)) return { state, events };
  const battle = state.battle;
  const effects = battle.entities.filter(isLivingCombatMonster).map((target) => ({
    ...fixedDamageResolution(target, "room:ours"),
    targetStatusEffects: [
      { kind: "debuff" as const, duration: 1 },
      { kind: "buff" as const, duration: 2 },
    ],
  }));
  const statuses = applyBattleSkillStatuses(
    battle,
    battle.entities,
    "",
    effects,
    state.seed,
    battle.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  return {
    state: {
      ...state,
      battle: { ...battle, entities: statuses.entities, rngCursor: statuses.rngCursor },
    },
    events: [
      ...events,
      ...statuses.events,
      {
        type: "passiveTriggered",
        entityId: actorId,
        trigger: "ours",
        message: "Ours!：拾取宝箱，房内怪物减益 1t、增益 2t（R-234、R-238）",
      },
    ],
  };
}
