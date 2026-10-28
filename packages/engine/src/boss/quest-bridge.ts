import { basicQuests, type BasicQuestId } from "../../../data/src/basic-quests";
import type { BossScriptId } from "./types";

/** R-120：是否为 Boss / 最暗定额任务卡。 */
export function isBossQuestId(questId: string): questId is BasicQuestId {
  const quest = basicQuests.find((q) => q.id === questId);
  return quest !== undefined && "bossQuest" in quest && quest.bossQuest;
}

/**
 * Boss 任务 → 战斗脚本 id。
 * 完整映射待 Kyries 确认（各幕 Face the Threat 与四遗迹 Boss 等级）。
 * 本 PR 不填印刷 Boss，避免编造对应关系。
 */
export const bossQuestScriptId: Partial<Record<BasicQuestId, BossScriptId>> = {};

export function resolveBossScriptIdForQuest(questId: string): BossScriptId | undefined {
  if (!isBossQuestId(questId)) return undefined;
  return bossQuestScriptId[questId];
}

/** Face the Threat 任务卡 id（印刷 p19）；幕内 Boss 身份仍待确认。 */
export const FACE_THE_THREAT_QUEST_ID = "quest:p019" as const satisfies BasicQuestId;
