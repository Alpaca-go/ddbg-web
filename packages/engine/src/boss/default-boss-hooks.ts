import type { BasicQuestId, CampaignLevel } from "../../../data/src/basic-quests";
import { readBossCombatEntry } from "./combat-entry";
import {
  FACE_THE_THREAT_QUEST_ID,
  isBossQuestId,
  resolveBossScriptIdForQuest,
} from "./quest-bridge";
import { getBossScript } from "./registry";
import type {
  BossFaceTheThreatContext,
  BossFaceTheThreatEmbarkResult,
  BossScriptId,
  BossSlotPlacementContext,
  BossSlotPlacementResult,
} from "./types";

/** R-121：quest_map:p011 三 Boss 位节点 id（VQ-08）。 */
export const R121_BOSS_SLOTS_QUEST_MAP_P011 = ["A", "B", "G"] as const;

/** R-121：quest_map:p012 三 Boss 位节点 id（VQ-09）。 */
export const R121_BOSS_SLOTS_QUEST_MAP_P012 = ["A", "C", "D"] as const;

export const R121_BOSS_SLOT_LAYOUTS = {
  "quest_map:p011": R121_BOSS_SLOTS_QUEST_MAP_P011,
  "quest_map:p012": R121_BOSS_SLOTS_QUEST_MAP_P012,
} as const satisfies Record<string, readonly string[]>;

export const FACE_EMBARK_WIRING_HOLD =
  "边缘房选图 / R-121 三格洗牌与 room token 写入 dungeon 未接（R-121 §6、R-046；最暗 p016–p018 Boss 击败判定仍 hold）";

export const BOSS_SLOT_WIRING_HOLD =
  "目标 + 2 随机非目标洗入三格与 room token 写入 dungeon 未接（R-121 §6、R-046）";

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

export function canonicalBossSlotNodeIdsForLayout(layoutId: string): readonly string[] | undefined {
  return R121_BOSS_SLOT_LAYOUTS[layoutId as keyof typeof R121_BOSS_SLOT_LAYOUTS];
}

export function resolveBossScriptIdForFaceTheThreatContext(
  ctx: Pick<BossFaceTheThreatContext, "questId" | "campaignLevel" | "activeBossThreatScriptId">,
): BossScriptId | undefined {
  const bridgeContext: {
    campaignLevel?: CampaignLevel;
    activeBossThreatScriptId?: BossScriptId;
  } = {};
  if (ctx.campaignLevel !== undefined) bridgeContext.campaignLevel = ctx.campaignLevel;
  if (ctx.activeBossThreatScriptId !== undefined) {
    bridgeContext.activeBossThreatScriptId = ctx.activeBossThreatScriptId;
  }
  return resolveBossScriptIdForQuest(ctx.questId, bridgeContext);
}

function faceTheThreatUnresolvedHold(
  questId: BasicQuestId,
  campaignLevel: CampaignLevel | undefined,
): BossFaceTheThreatEmbarkResult {
  const levelLabel = campaignLevel ?? "缺省→I";
  const isP019 = questId === FACE_THE_THREAT_QUEST_ID;
  const hold =
    isP019 && (campaignLevel === 2 || campaignLevel === 3)
      ? "faceTheThreatBossScriptByCampaignLevel II/III 待确认"
      : isP019
        ? "faceTheThreatBossScriptByCampaignLevel / activeBossThreatScriptId"
        : "bossQuestScriptId 待脚本";
  return {
    status: "stub",
    message: `Face the Threat：quest=${questId} 无 Boss 脚本映射（战役等级 ${levelLabel}）`,
    hold,
  };
}

/** 默认 Face the Threat 钩子：解析 quest + 迫近威胁 → combatEntry；出征状态迁移仍 hold。 */
export function defaultFaceTheThreatEmbarkHook(
  ctx: BossFaceTheThreatContext,
): BossFaceTheThreatEmbarkResult {
  if (!isBossQuestId(ctx.questId)) {
    return {
      status: "stub",
      message: `Face the Threat：quest=${ctx.questId} 非 Boss 任务卡`,
      hold: "R-120",
    };
  }

  const resolvedScriptId = resolveBossScriptIdForFaceTheThreatContext(ctx);
  if (!resolvedScriptId) {
    return faceTheThreatUnresolvedHold(ctx.questId as BasicQuestId, ctx.campaignLevel);
  }

  if (ctx.scriptId !== resolvedScriptId) {
    return {
      status: "stub",
      message: `Face the Threat：钩子脚本 ${ctx.scriptId} 与 resolveBossScriptIdForQuest→${resolvedScriptId} 不一致`,
      hold: "activeBossThreatScriptId / resolveBossScriptIdForQuest",
    };
  }

  const script = getBossScript(resolvedScriptId);
  const combatEntry = readBossCombatEntry(script);
  if (!combatEntry) {
    return {
      status: "stub",
      message: `Face the Threat：脚本 ${resolvedScriptId} 无 combatEntry`,
      hold: "Boss 脚本 combatEntry",
    };
  }

  return {
    status: "ok",
    value: {
      resolvedScriptId,
      questId: ctx.questId as BasicQuestId,
      combatEntry,
      rulesRef: ["spec:§14.1", "R30", "R35", "R11", FACE_THE_THREAT_QUEST_ID, resolvedScriptId],
      wiringHold: FACE_EMBARK_WIRING_HOLD,
    },
  };
}

/** 默认 Boss 位钩子：R-121 节点校验 + 布置算法语义；RNG / dungeon 写入仍 hold。 */
export function defaultBossSlotPlacementHook(
  ctx: BossSlotPlacementContext,
): BossSlotPlacementResult {
  const canonical = canonicalBossSlotNodeIdsForLayout(ctx.layoutId);
  if (!canonical) {
    return {
      status: "stub",
      message: `Boss 位：layout=${ctx.layoutId} 非 R-121 已批准边缘图（quest_map:p011/p012）`,
      hold: "R-121 / 边缘房选图 hold",
    };
  }

  if (ctx.bossSlotNodeIds.length !== 3) {
    return {
      status: "stub",
      message: `Boss 位：layout=${ctx.layoutId} 需 3 格，收到 ${ctx.bossSlotNodeIds.length}`,
      hold: "R-121",
    };
  }

  if (!sameStringSet(ctx.bossSlotNodeIds, canonical)) {
    return {
      status: "stub",
      message: `Boss 位：layout=${ctx.layoutId} 节点 ${ctx.bossSlotNodeIds.join(",")} 与 R-121 ${canonical.join(",")} 不一致`,
      hold: "R-121",
    };
  }

  return {
    status: "ok",
    value: {
      layoutId: ctx.layoutId,
      bossSlotNodeIds: [...ctx.bossSlotNodeIds],
      placementAlgorithm: "objectivePlusTwoRandomNonObjective",
      rulesRef: ["R-121", "spec:§5.1", "R36", ctx.layoutId],
      wiringHold: BOSS_SLOT_WIRING_HOLD,
    },
  };
}
