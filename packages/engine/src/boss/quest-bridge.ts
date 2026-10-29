import { basicQuests, type BasicQuestId, type CampaignLevel } from "../../../data/src/basic-quests";
import { readCampaignLevel } from "../hamlet-campaign";
import { ensureCoreBossScriptsRegistered } from "./ensure-core-boss-scripts";
import { getBossScript } from "./registry";
import type { BossScriptId } from "./types";

/** quest:p019 @ CL I 沙盒缺省；与 `necromancer-i` 脚本 id 一致，避免 quest-bridge ↔ 脚本模块循环依赖。 */
const FACE_THE_THREAT_DEFAULT_SCRIPT_ID_CL1 =
  "boss:ruins:necromancer:1" as const satisfies BossScriptId;

/** R-120：是否为 Boss / 最暗定额任务卡。 */
export function isBossQuestId(questId: string): questId is BasicQuestId {
  const quest = basicQuests.find((q) => q.id === questId);
  return quest !== undefined && "bossQuest" in quest && quest.bossQuest;
}

/**
 * Boss 任务 → 战斗脚本 id（一对一任务卡，如最暗 p016–p018）。
 * 仅填入**已注册** Boss 脚本；无脚本则留空，不编造 id。
 *
 * | questId     | 印刷 Boss（p16–18 SPECIAL） | 脚本 |
 * |-------------|------------------------------|------|
 * | quest:p016  | Shuffling Horror             | 待脚本 |
 * | quest:p017  | Templars                     | 待脚本 |
 * | quest:p018  | Mammoth Cyst                 | 待脚本 |
 */
export const bossQuestScriptId: Partial<Record<BasicQuestId, BossScriptId>> = {};

/**
 * quest:p019 **Face the Threat!** 随战役等级对应 Ruins Boss **等级**（规则书 §2.1 / §14.1、R35）；
 * 具体四 Boss 之一由迫近威胁决定（§2.2 / R11），运行时未接。
 *
 * 已核实且已注册：战役 I 级 → Necromancer I（`boss:ruins:necromancer:1`，#331）。
 * II/III 与其它 Boss 脚本落地后再填；未映射等级仍走普通第 4 轮撤退（Kyries 认可）。
 */
export const faceTheThreatBossScriptByCampaignLevel: Partial<Record<CampaignLevel, BossScriptId>> =
  {
    1: FACE_THE_THREAT_DEFAULT_SCRIPT_ID_CL1,
  };

/** Face the Threat 任务卡 id（印刷 p19）。 */
export const FACE_THE_THREAT_QUEST_ID = "quest:p019" as const satisfies BasicQuestId;

export function isFaceTheThreatQuestId(questId: string): questId is typeof FACE_THE_THREAT_QUEST_ID {
  return questId === FACE_THE_THREAT_QUEST_ID;
}

export type BossQuestScriptContext = {
  readonly campaignLevel?: CampaignLevel;
  readonly activeBossThreatScriptId?: BossScriptId;
};

export function resolveBossScriptIdForQuest(
  questId: string,
  context?: BossQuestScriptContext | null,
): BossScriptId | undefined {
  if (!isBossQuestId(questId)) return undefined;
  const direct = bossQuestScriptId[questId];
  if (direct) return direct;
  if (questId === FACE_THE_THREAT_QUEST_ID) {
    ensureCoreBossScriptsRegistered();
    const active = context?.activeBossThreatScriptId;
    if (active && getBossScript(active)) return active;
    const level = readCampaignLevel(context ?? {});
    return faceTheThreatBossScriptByCampaignLevel[level];
  }
  return undefined;
}
