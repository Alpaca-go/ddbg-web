import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { wealdMechanicsActive } from "./weald/weald-mechanics";
import {
  wealdOrdinaryRoomEffectActive,
  wealdStygianEffect,
} from "./weald/rooms/stygian-room-effects";

function stashActive(state: GameState): boolean {
  return (
    wealdMechanicsActive(state) && wealdOrdinaryRoomEffectActive(state, "room:weald:04", "precious")
  );
}

export function enablePrecious(state: GameState): GameState {
  return stashActive(state)
    ? { ...state, battle: { ...state.battle!, wealdPrecious: true } }
    : state;
}

/** R-234／R-237：D 区怪物结束回合；其他活怪物各受两项独立增益 2t。 */
export function endTurnPrecious(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  if (!state.battle?.wealdPrecious || !stashActive(state)) return null;
  const battle = state.battle;
  const actor = battle.entities.find((e) => e.id === actorId);
  if (!actor || actor.dead || actor.side !== "monster" || actor.areaId !== "D") return null;
  const effects = battle.entities
    .filter((e) => e.side === "monster" && !e.dead && e.id !== actorId)
    .map((target) => ({
      ...fixedDamageResolution(target, "room:precious"),
      targetStatusEffects: [
        { kind: "buff" as const, duration: 2 },
        { kind: "buff" as const, duration: 2 },
      ], // scaled below when Stygian 启用
    }));
  if (!effects.length) return null;
  const stygian = wealdStygianEffect(state.dungeon, "precious");
  const duration = stygian?.kind === "precious" ? stygian.buffDuration : 2;
  const applications = stygian?.kind === "precious" ? stygian.buffApplications : 2;
  const scaled = effects.map((effect) => ({
    ...effect,
    targetStatusEffects: Array.from({ length: applications }, () => ({
      kind: "buff" as const,
      duration,
    })),
  }));
  const statuses = applyBattleSkillStatuses(
    battle,
    battle.entities,
    "",
    scaled,
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
        trigger: "precious",
        message: `Precious：D 区怪物结束回合，其他怪物分别获得两项增益 ${duration}t（R-234、R-237）`,
      },
    ],
  };
}
