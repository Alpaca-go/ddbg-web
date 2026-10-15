import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";

/** 卡面p4、R32/33、R-048：下次出征起始光照4；图标d13c8b76af已确认。 */
export function applyUnsettlingDarkness(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.active !== "hamlet_event:p004" ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    hamletEventCompletionProblem(d)
  )
    return rejectBattleCommand(state, "Unsettling Darkness须在完整回村与事件牌池下结算（R32）");
  const completed = completeHamletEvent({
    ...state,
    dungeon: { ...d, nextQuestStartingLight: 4 },
  });
  return {
    ...completed,
    events: [
      {
        type: "dungeonUpdated",
        message: "Unsettling Darkness：下次出征起始光照为4（卡面p4、R-048）",
      },
      ...completed.events,
    ],
  };
}
