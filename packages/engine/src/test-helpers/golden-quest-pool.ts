import type { CampaignLevel } from "../../../data/src/basic-quests";
import { setCampaignQuestPoolTestFilter } from "../campaign-quest-pool";

/**
 * PR #296 前 main 已接通的 I/II 出征池（p004–p011 等未进池时的黄金路径）。
 * 测试夹具用此列表过滤 `questsForCampaignLevel`，使 offerNextQuest 的 shuffleIds 步数与旧池一致。
 */
export const GOLDEN_MAIN_CAMPAIGN_QUEST_IDS: Record<CampaignLevel, readonly string[]> = {
  1: ["quest:p001", "quest:p002", "quest:p003"],
  2: ["quest:p007", "quest:p008"],
  3: [],
};

export function installGoldenMainCampaignQuestPool() {
  setCampaignQuestPoolTestFilter((level, quests) => {
    const allowed = new Set(GOLDEN_MAIN_CAMPAIGN_QUEST_IDS[level]);
    return quests.filter((q) => allowed.has(q.id));
  });
}

export function restoreCampaignQuestPool() {
  setCampaignQuestPoolTestFilter(null);
}
