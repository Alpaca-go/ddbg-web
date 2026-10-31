import { readBasicQuest } from "../../data/src/basic-quests";
import type { DungeonState } from "./dungeon";
import {
  questMonsterDeploymentMatchesPlan,
  readQuestMonsterPlanAtRoom,
} from "./quest-monster-spawn";

/** QUEST p9/p13、R-048：未按计划部署时不得降级为普通随机遭遇；已部署则保留 combatReady 停点。 */
export function questMonsterDeploymentHold(d: DungeonState): string | undefined {
  const plan = readQuestMonsterPlanAtRoom(d);
  if (!plan || plan.combatReady) return undefined;
  const quest = readBasicQuest(d.questDistribution)!;
  const level = plan.printedMonsterLevel === null ? "" : ` III级`;
  const bonus =
    plan.lifeBonus || plan.dodgeBonus ? `（生命+${plan.lifeBonus}、闪避+${plan.dodgeBonus}）` : "";
  if (questMonsterDeploymentMatchesPlan(d, plan)) {
    return `${quest.name} 目标房已部署${level} ${plan.monsterName}${bonus}；完整战斗字段未批准（combatReady: false），不能进入半场战斗（QUEST p${plan.source.page}、R-048）`;
  }
  return `${quest.name} 目标房须生成${level} ${plan.monsterName}${bonus}；不能用普通随机遭遇替代（QUEST p${plan.source.page}、R-048）`;
}
