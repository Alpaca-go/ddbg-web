import {
  questsForCampaignLevel as dataQuestsForCampaignLevel,
  type CampaignLevel,
} from "../../data/src/basic-quests";

type BasicQuest = ReturnType<typeof dataQuestsForCampaignLevel>[number];

let testFilter:
  ((level: CampaignLevel, quests: readonly BasicQuest[]) => readonly BasicQuest[]) | null = null;

/** 仅引擎单元/场景测试：临时收窄出征池，避免扩大 remaining 后 shuffleIds 步数漂移黄金种子。 */
export function setCampaignQuestPoolTestFilter(
  filter: ((level: CampaignLevel, quests: readonly BasicQuest[]) => readonly BasicQuest[]) | null,
) {
  testFilter = filter;
}

export function questsForCampaignLevel(level: CampaignLevel) {
  const quests = dataQuestsForCampaignLevel(level);
  return testFilter ? testFilter(level, quests) : quests;
}
