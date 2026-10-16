import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";

/** p3、R-087：当前仅记录减骰计划；下次出征掷前由队伍选择取消，不提前掷骰。 */
export function applyLostShipment(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.active !== "hamlet_event:p003" ||
    d.nextQuestLostShipment !== undefined ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    d.heroes.some((h) => h.dead) ||
    hamletEventCompletionProblem(d)
  )
    return rejectBattleCommand(state, "Lost Shipment须在完整回村与事件牌池下结算（R32/R-087）");
  const completed = completeHamletEvent({
    ...state,
    dungeon: { ...d, nextQuestLostShipment: true },
  });
  return {
    ...completed,
    events: [
      {
        type: "dungeonUpdated",
        message:
          "Lost Shipment：下次任务掷前由队伍取消两颗常规补给，Radiant自选骰也可取消；建筑奖励照常（R-087）",
      },
      ...completed.events,
    ],
  };
}
