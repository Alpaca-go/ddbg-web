import type { CampaignLevel } from "../../../data/src/basic-quests";
import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import type { DungeonState } from "../dungeon";
import { questsForCampaignLevel } from "../campaign-quest-pool";
import { readCampaignLevel } from "../hamlet-campaign";
import { FACE_EMBARK_WIRING_HOLD } from "./default-boss-hooks";
import { runFaceTheThreatEmbarkForQuest } from "./face-the-threat-hooks";
import { FACE_THE_THREAT_QUEST_ID, isFaceTheThreatQuestId } from "./quest-bridge";
import type { BossCombatEntryRefs, BossFaceTheThreatEmbarkPlan, BossScriptId } from "./types";

/** spec §2.1 / §14.1：每幕 2 个普通任务后再接 Face the Threat。 */
export const REGULAR_QUESTS_PER_ACT_BEFORE_FACE_THE_THREAT = 2 as const;

/** 与钩子 `wiringHold` 一致；layout / R-121 仍 hold。 */
export const FACE_EMBARK_LAYOUT_WIRING_HOLD = FACE_EMBARK_WIRING_HOLD;

/** `chooseNextQuest` 成功后写入 dungeon；供 Boss 遭遇 / 后续 R-121 读取。 */
export type StoredFaceTheThreatEmbarkPlan = {
  readonly resolvedScriptId: BossScriptId;
  readonly questId: typeof FACE_THE_THREAT_QUEST_ID;
  readonly combatEntry: BossCombatEntryRefs;
  readonly rulesRef: readonly string[];
  readonly layoutWiringHold: typeof FACE_EMBARK_LAYOUT_WIRING_HOLD;
};

export type FaceTheThreatEmbarkResolve =
  | { readonly kind: "notApplicable" }
  | { readonly kind: "refused"; readonly result: ApplyResult }
  | { readonly kind: "ok"; readonly plan: StoredFaceTheThreatEmbarkPlan };

export function storedFaceTheThreatEmbarkPlanFromHook(
  value: BossFaceTheThreatEmbarkPlan,
): StoredFaceTheThreatEmbarkPlan {
  return {
    resolvedScriptId: value.resolvedScriptId,
    questId: FACE_THE_THREAT_QUEST_ID,
    combatEntry: value.combatEntry,
    rulesRef: value.rulesRef,
    layoutWiringHold: FACE_EMBARK_LAYOUT_WIRING_HOLD,
  };
}

export function readStoredFaceTheThreatEmbarkPlan(
  d: DungeonState | undefined,
): StoredFaceTheThreatEmbarkPlan | undefined {
  return d?.faceTheThreatEmbarkPlan;
}

/**
 * 当前战役等级下已完成的普通任务数（不含 Boss 卡）。
 * `chooseNextQuest` 每次把上一趟 `questSummary` 与未选 offer 写入 `discardedQuests`；
 * 首趟任务完成前无 choose 循环，靠当前 summary 计 1。
 */
export function countCompletedRegularQuestsAtCampaignLevel(
  d: Pick<DungeonState, "discardedQuests" | "questSummary">,
  campaignLevel: CampaignLevel,
): number {
  const regularIds = questsForCampaignLevel(campaignLevel).map((q) => q.id);
  const regularSet = new Set<string>(regularIds);
  const discardedRegular = (d.discardedQuests ?? []).filter((id) => regularSet.has(id));
  const chooseCycles = Math.floor(discardedRegular.length / 2);
  const trailingSingleOffer = discardedRegular.length % 2;
  const completedInDiscarded = chooseCycles + trailingSingleOffer;
  const current = d.questSummary?.awarded ? d.questSummary.questId : undefined;
  const includeCurrent =
    current && regularSet.has(current) && !(d.discardedQuests ?? []).includes(current) ? 1 : 0;
  return completedInDiscarded + includeCurrent;
}

/**
 * R30 / R-126：幕末两普通任务后解析 p019。II 级沿 R-124 匹配实际威胁；
 * 缺失或不匹配时返回拒绝，不回退普通抽卡。I 级保留既有行为，III 级仍 hold。
 */
export function resolveFaceTheThreatOfferAtNextQuest(state: GameState): FaceTheThreatEmbarkResolve {
  const d = state.dungeon;
  if (!d?.questSummary?.awarded) return { kind: "notApplicable" };
  const campaignLevel = readCampaignLevel(d);
  if (campaignLevel !== 1 && campaignLevel !== 2) return { kind: "notApplicable" };
  if (campaignLevel === 1 && !d.activeBossThreatScriptId) return { kind: "notApplicable" };
  if (
    countCompletedRegularQuestsAtCampaignLevel(d, campaignLevel) <
    REGULAR_QUESTS_PER_ACT_BEFORE_FACE_THE_THREAT
  ) {
    return { kind: "notApplicable" };
  }
  const embark = resolveFaceTheThreatEmbarkForChoose(state, FACE_THE_THREAT_QUEST_ID);
  return campaignLevel === 1 && embark.kind !== "ok" ? { kind: "notApplicable" } : embark;
}

export function shouldForceFaceTheThreatOfferAtNextQuest(state: GameState): boolean {
  return resolveFaceTheThreatOfferAtNextQuest(state).kind === "ok";
}

/**
 * quest:p019 出征等级按战役等级（R35）；`basic-quests` 的 `level: 3` 为 schema 占位（R-120）。
 */
export function faceTheThreatEmbarkLevelMismatchReason(
  d: Pick<DungeonState, "campaignLevel" | "trinkets">,
): string | null {
  const campaignLevel = readCampaignLevel(d);
  if (d.trinkets && d.trinkets.level !== campaignLevel) {
    return "地牢饰品等级须等于战役等级，未出征 Face the Threat（R35）";
  }
  return null;
}

/**
 * 解析 Face the Threat 钩子；**不**消耗 RNG。stub 时由调用方拒绝命令。
 */
function faceTheThreatQuestContext(
  d: Pick<
    DungeonState,
    "campaignLevel" | "activeBossThreatScriptId" | "imminentThreatDescriptionCardId"
  >,
): import("./types").FaceTheThreatQuestContext {
  const base = {
    questId: FACE_THE_THREAT_QUEST_ID,
    campaignLevel: readCampaignLevel(d),
  };
  if (d.activeBossThreatScriptId) {
    return {
      ...base,
      activeBossThreatScriptId: d.activeBossThreatScriptId,
      ...(d.imminentThreatDescriptionCardId
        ? { imminentThreatDescriptionCardId: d.imminentThreatDescriptionCardId }
        : {}),
    };
  }
  return base;
}

export function resolveFaceTheThreatEmbarkForChoose(
  state: GameState,
  questId: string,
): FaceTheThreatEmbarkResolve {
  if (!isFaceTheThreatQuestId(questId)) return { kind: "notApplicable" };
  const d = state.dungeon;
  if (!d) {
    return {
      kind: "refused",
      result: rejectBattleCommand(state, "Face the Threat 出征缺地牢状态"),
    };
  }
  const levelReason = faceTheThreatEmbarkLevelMismatchReason(d);
  if (levelReason) {
    return { kind: "refused", result: rejectBattleCommand(state, levelReason) };
  }
  const hook = runFaceTheThreatEmbarkForQuest(faceTheThreatQuestContext(d));
  if (hook.status === "stub") {
    return {
      kind: "refused",
      result: rejectBattleCommand(
        state,
        `${hook.message}（${hook.hold ?? "hold"}；未出征、未消耗 RNG）`,
      ),
    };
  }
  return {
    kind: "ok",
    plan: storedFaceTheThreatEmbarkPlanFromHook(hook.value),
  };
}

/** 沙盒 `createCoreDungeonQuest`：p019 须钩子 ok，否则 throw（无 applyCommand）。 */
export function requireFaceTheThreatEmbarkPlanForSandbox(
  d: Pick<
    DungeonState,
    "campaignLevel" | "activeBossThreatScriptId" | "imminentThreatDescriptionCardId"
  >,
): StoredFaceTheThreatEmbarkPlan {
  const hook = runFaceTheThreatEmbarkForQuest(faceTheThreatQuestContext(d));
  if (hook.status === "stub") {
    throw new Error(`${hook.message}（${hook.hold ?? "hold"}）`);
  }
  return storedFaceTheThreatEmbarkPlanFromHook(hook.value);
}
