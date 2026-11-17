import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { wealdMechanicsActive } from "./expansions/weald/weald-mechanics";
import { wealdOrdinaryRoomEffectActive, wealdStygianEffect } from "./weald-stygian-room-effects";

/** R-234：Ambush 全房间英雄减益 2t；由 startBattle 新版本调用一次。 */
export function applyUnprepared(state: GameState): ApplyResult {
  if (
    !wealdMechanicsActive(state) ||
    !wealdOrdinaryRoomEffectActive(state, "room:weald:p002", "unprepared")
  )
    return { state, events: [] };
  const stygian = wealdStygianEffect(state.dungeon, "unprepared");
  const duration = stygian?.kind === "unprepared" ? stygian.debuffDuration : 2;
  const battle = state.battle!;
  const effects = battle.entities
    .filter((e) => e.side === "hero" && !e.dead)
    .map((hero) => ({
      ...fixedDamageResolution(hero, "room:unprepared"),
      targetStatusEffects: [{ kind: "debuff" as const, duration }],
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
      ...statuses.events,
      {
        type: "passiveTriggered",
        entityId: "room:weald:p002",
        trigger: "unprepared",
        message: `Unprepared!：战斗开始时所有英雄减益 ${duration}t（R-234）`,
      },
    ],
  };
}
