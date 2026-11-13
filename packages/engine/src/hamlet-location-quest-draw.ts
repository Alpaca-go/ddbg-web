import {
  questsForCampaignLevel,
  questsForContentPacks,
  SANDBOX_WEALD_EMBARK_QUEST_IDS,
  type BasicQuestId,
  type CampaignLevel,
} from "../../data/src/basic-quests";
import type { ContentPackId } from "../../data/src/content-packs";

export type HamletLocationQuestDeck = "ruins" | "weald";

export const HAMLET_QUEST_DRAW_OPTION = {
  ruinsTwo: "hamlet-quest-draw:ruins-two",
  wealdTwo: "hamlet-quest-draw:weald-two",
  splitOneEach: "hamlet-quest-draw:split-one-each",
} as const;

export type HamletQuestDrawOptionId =
  (typeof HAMLET_QUEST_DRAW_OPTION)[keyof typeof HAMLET_QUEST_DRAW_OPTION];

export function hamletWealdLocationDrawEnabled(packs?: readonly ContentPackId[]): boolean {
  return packs?.includes("weald") === true;
}

function questIdsForLocationDeck(
  deck: HamletLocationQuestDeck,
  campaignLevel: CampaignLevel,
  contentPacks?: readonly ContentPackId[],
): readonly BasicQuestId[] {
  if (deck === "ruins") {
    return questsForCampaignLevel(campaignLevel).map((q) => q.id);
  }
  if (!contentPacks?.includes("weald") || campaignLevel !== 1) return [];
  return SANDBOX_WEALD_EMBARK_QUEST_IDS;
}

/** 单地点剩余普通任务（不含当前进行中任务与弃置）。 */
export function remainingQuestIdsForLocationDeck(
  deck: HamletLocationQuestDeck,
  campaignLevel: CampaignLevel,
  contentPacks: readonly ContentPackId[] | undefined,
  currentQuestId: string,
  discarded: readonly string[],
): readonly BasicQuestId[] {
  return questIdsForLocationDeck(deck, campaignLevel, contentPacks).filter(
    (id) => id !== currentQuestId && !discarded.includes(id),
  );
}

export type HamletQuestDrawModePlan = {
  readonly optionId: HamletQuestDrawOptionId;
  readonly label: string;
};

/** 合法抽法：单堆≥2 可抽 2；两堆各≥1 可各抽 1（已选 Weald 包且 I 级才有 Weald 堆）。 */
export function legalHamletQuestDrawModes(
  campaignLevel: CampaignLevel,
  contentPacks: readonly ContentPackId[] | undefined,
  currentQuestId: string,
  discarded: readonly string[],
): readonly HamletQuestDrawModePlan[] {
  if (!hamletWealdLocationDrawEnabled(contentPacks)) return [];
  const ruins = remainingQuestIdsForLocationDeck(
    "ruins",
    campaignLevel,
    contentPacks,
    currentQuestId,
    discarded,
  );
  const weald = remainingQuestIdsForLocationDeck(
    "weald",
    campaignLevel,
    contentPacks,
    currentQuestId,
    discarded,
  );
  const modes: HamletQuestDrawModePlan[] = [];
  if (ruins.length >= 2) {
    modes.push({ optionId: HAMLET_QUEST_DRAW_OPTION.ruinsTwo, label: "遗迹：从遗迹任务堆抽 2 张" });
  }
  if (weald.length >= 2) {
    modes.push({
      optionId: HAMLET_QUEST_DRAW_OPTION.wealdTwo,
      label: "Weald：从 Weald 任务堆抽 2 张",
    });
  }
  if (ruins.length >= 1 && weald.length >= 1) {
    modes.push({
      optionId: HAMLET_QUEST_DRAW_OPTION.splitOneEach,
      label: "遗迹与 Weald：两地任务堆各抽 1 张",
    });
  }
  return modes;
}

/** 未选 Weald 包或沿用混合内容包过滤时的单池剩余（与改前一致，不按地点分堆）。 */
export function remainingQuestIdsSinglePool(
  campaignLevel: CampaignLevel,
  contentPacks: readonly ContentPackId[] | undefined,
  currentQuestId: string,
  discarded: readonly string[],
): readonly BasicQuestId[] {
  const levelPool =
    contentPacks !== undefined
      ? questsForContentPacks(campaignLevel, contentPacks)
      : questsForCampaignLevel(campaignLevel);
  return levelPool
    .map((q) => q.id)
    .filter((id) => id !== currentQuestId && !discarded.includes(id));
}

export function remainingWealdQuestIdsForCampaignDiscard(
  campaignLevel: CampaignLevel,
  contentPacks: readonly ContentPackId[] | undefined,
  discarded: readonly string[],
): readonly BasicQuestId[] {
  return questIdsForLocationDeck("weald", campaignLevel, contentPacks).filter(
    (id) => !discarded.includes(id),
  );
}
