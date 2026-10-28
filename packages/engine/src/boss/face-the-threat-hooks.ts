import { ensureCoreBossScriptsRegistered } from "./ensure-core-boss-scripts";
import { runBossHook } from "./hooks";
import { getBossScript } from "./registry";
import type {
  BossFaceTheThreatEmbarkResult,
  BossScriptId,
  BossSlotPlacementContext,
  BossSlotPlacementResult,
  FaceTheThreatQuestContext,
} from "./types";
import {
  defaultFaceTheThreatEmbarkHook,
  resolveBossScriptIdForFaceTheThreatContext,
} from "./default-boss-hooks";

export {
  BOSS_SLOT_WIRING_HOLD,
  canonicalBossSlotNodeIdsForLayout,
  defaultBossSlotPlacementHook,
  defaultFaceTheThreatEmbarkHook,
  FACE_EMBARK_WIRING_HOLD,
  R121_BOSS_SLOTS_QUEST_MAP_P011,
  R121_BOSS_SLOTS_QUEST_MAP_P012,
  R121_BOSS_SLOT_LAYOUTS,
  resolveBossScriptIdForFaceTheThreatContext,
} from "./default-boss-hooks";

/**
 * 按 quest + `activeBossThreatScriptId` 解析并执行对应脚本的 Face the Threat 钩子。
 * 无脚本或未注册时返回 stub，不调用 per-boss override。
 */
export function runFaceTheThreatEmbarkForQuest(
  context: FaceTheThreatQuestContext,
): BossFaceTheThreatEmbarkResult {
  ensureCoreBossScriptsRegistered();
  const resolvedScriptId = resolveBossScriptIdForFaceTheThreatContext(context);
  if (!resolvedScriptId) {
    return defaultFaceTheThreatEmbarkHook({
      scriptId: "boss:unresolved:0" as BossScriptId,
      questId: context.questId,
      ...(context.campaignLevel !== undefined ? { campaignLevel: context.campaignLevel } : {}),
      ...(context.activeBossThreatScriptId !== undefined
        ? { activeBossThreatScriptId: context.activeBossThreatScriptId }
        : {}),
    });
  }
  const script = getBossScript(resolvedScriptId);
  if (!script) {
    return {
      status: "stub",
      message: `Face the Threat：脚本 ${resolvedScriptId} 未注册`,
      hold: "Boss registry",
    };
  }
  return runBossHook(script, "faceTheThreatEmbark", {
    scriptId: resolvedScriptId,
    questId: context.questId,
    ...(context.campaignLevel !== undefined ? { campaignLevel: context.campaignLevel } : {}),
    ...(context.activeBossThreatScriptId !== undefined
      ? { activeBossThreatScriptId: context.activeBossThreatScriptId }
      : {}),
  }) as BossFaceTheThreatEmbarkResult;
}

/** 对指定脚本执行 Boss 位钩子（供 encounter / 任务卡接线探针）。 */
export function runBossSlotPlacementForScript(
  scriptId: BossScriptId,
  ctx: Omit<BossSlotPlacementContext, "scriptId">,
): BossSlotPlacementResult {
  ensureCoreBossScriptsRegistered();
  const script = getBossScript(scriptId);
  if (!script) {
    return {
      status: "stub",
      message: `Boss 位：脚本 ${scriptId} 未注册`,
      hold: "Boss registry",
    };
  }
  return runBossHook(script, "bossSlotPlacement", { scriptId, ...ctx }) as BossSlotPlacementResult;
}
