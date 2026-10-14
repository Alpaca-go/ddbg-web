import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";
import {
  buildingLevelsProblem,
  raiseHamletBuilding,
  recoveryBuildingLevel,
  stagecoachWaitingTokens,
  upgradableBuildings,
} from "./hamlet-buildings";

function laborProblem(state: GameState) {
  const d = state.dungeon;
  return !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.hamlet?.active !== "hamlet_event:p006" ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead)
    ? "请先完成回村和死亡英雄补位，不能结算Labor Force"
    : (buildingLevelsProblem(d) ?? hamletEventCompletionProblem(d));
}
const names = {
  abbey: "修道院",
  tavern: "酒馆",
  sanitarium: "疗养院",
  survivalist: "生存专家",
  stagecoach: "驿站",
  blacksmith: "铁匠",
  nomadWagon: "游商马车",
};
function laborOptions(state: GameState) {
  const d = state.dungeon!;
  return [
    ...upgradableBuildings
      .filter(
        (building) =>
          recoveryBuildingLevel(d, building) < 3 &&
          (building !== "stagecoach" || stagecoachWaitingTokens(d) !== null),
      )
      .map((building) => ({
        id: building,
        label: `免费升级${names[building]}至${recoveryBuildingLevel(d, building) === 1 ? "II" : "III"}级；本次村庄准备期间不可访问`,
      })),
    { id: "skip", label: "放弃免费升级；事件仍永久移出牌堆" },
  ];
}
/** 印刷卡p6、官方R32/33、R-077：团队可升一栋一级，无金币或英雄行动费用。 */
export function beginLaborForce(state: GameState): ApplyResult {
  const problem = laborProblem(state);
  if (problem) return rejectBattleCommand(state, problem);
  const d = state.dungeon!;
  if (d.pending) return rejectBattleCommand(state, "Labor Force已有待选，不能重复开始");
  const pending = {
    id: `hamlet-labor-force:${d.decision}`,
    actorId: "party",
    prompt: "Labor Force：选择一栋建筑免费升级，或放弃（卡面p6）",
    options: laborOptions(state),
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}
/** 校验当前可用选项，不能通过伪造待选升级公会/墓地、越过III级或重复发放代币。 */
export function chooseLaborForce(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const problem = laborProblem(state);
  if (problem) return rejectBattleCommand(state, problem);
  const d = state.dungeon!,
    h = d.hamlet!,
    pending = d.pending;
  if (
    !pending ||
    pending.id !== choiceId ||
    !pending.id.startsWith("hamlet-labor-force:") ||
    !pending.options.some((o) => o.id === optionId) ||
    !laborOptions(state).some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, "请选择当前Labor Force允许的建筑，或放弃");
  const building = upgradableBuildings.find((b) => b === optionId);
  const next = completeHamletEvent({
    ...state,
    dungeon: {
      ...(building ? raiseHamletBuilding(d, building) : d),
      pending: null,
      hamlet: {
        ...h,
        ...(building ? { weekBlockedBuildings: [building], blockedBuildings: [building] } : {}),
      },
    },
  });
  return {
    ...next,
    events: [
      {
        type: "dungeonUpdated",
        message: building
          ? `Labor Force：免费升级${names[building]}一级，本次村庄准备期间不可访问（卡面p6、R33）`
          : "Labor Force：放弃免费升级（卡面p6）",
      },
      ...next.events,
    ],
  };
}
