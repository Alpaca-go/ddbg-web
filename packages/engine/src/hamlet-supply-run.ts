import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";

/** Supply Run p1、R32/33、R-085：只记录下次任务的队伍奖励，此处不掷骰。 */
export function applySupplyRun(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.active !== "hamlet_event:p001" ||
    d.nextQuestPartyProvisionDice !== undefined ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    d.heroes.some((h) => h.dead) ||
    hamletEventCompletionProblem(d)
  )
    return rejectBattleCommand(state, "Supply Run须在完整回村与事件牌池下结算（R32/R-085）");
  const completed = completeHamletEvent({
    ...state,
    dungeon: { ...d, nextQuestPartyProvisionDice: 2 },
  });
  return {
    ...completed,
    events: [
      {
        type: "dungeonUpdated",
        message: "Supply Run：下次任务队伍额外掷2颗补给骰（卡面p1、R-085）",
      },
      ...completed.events,
    ],
  };
}
