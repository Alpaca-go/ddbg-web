import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { wealdMechanicsActive } from "./expansions/weald/weald-mechanics";

/** R-234：Ambush 全房间英雄减益 2t；由 startBattle 新版本调用一次。 */
export function applyUnprepared(state: GameState): ApplyResult {
  if (
    !wealdMechanicsActive(state) ||
    state.dungeon?.mode === "stygian" ||
    state.dungeon?.roomCards?.active?.cardId !== "room:weald:p002"
  )
    return { state, events: [] };
  const battle = state.battle!;
  const effects = battle.entities
    .filter((e) => e.side === "hero" && !e.dead)
    .map((hero) => ({
      ...fixedDamageResolution(hero, "room:unprepared"),
      targetStatusEffects: [{ kind: "debuff" as const, duration: 2 }],
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
        message: "Unprepared!：战斗开始时所有英雄减益 2t（R-234）",
      },
    ],
  };
}
