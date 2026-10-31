import questCards from "../../data/normalized/corebox/quest_cards.json";
import { readBasicQuest } from "../../data/src/basic-quests";
import { questCardsSchema } from "../../data/src/quest-cards";
import { readQuestMonsterPlan } from "../../data/src/quest-monster-plan";
import type { DungeonState } from "./dungeon";

const cards = questCardsSchema.parse(questCards);

/** QUEST p9/p13、R-048：指定生成未接线时不得降级为普通随机遭遇。 */
export function questMonsterDeploymentHold(d: DungeonState): string | undefined {
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "objective") return undefined;
  const quest = readBasicQuest(d.questDistribution);
  if (!quest) return undefined;
  const plan = readQuestMonsterPlan(cards, quest.id);
  if (!plan || plan.combatReady) return undefined;
  const level = plan.printedMonsterLevel === null ? "" : ` III级`;
  const bonus =
    plan.lifeBonus || plan.dodgeBonus ? `（生命+${plan.lifeBonus}、闪避+${plan.dodgeBonus}）` : "";
  return `${quest.name} 目标房须生成${level} ${plan.monsterName}${bonus}；任务指定生成尚未接线，不能用普通随机遭遇替代（QUEST p${plan.source.page}、R-048）`;
}
