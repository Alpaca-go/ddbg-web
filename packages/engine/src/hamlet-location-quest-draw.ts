import { createRng } from "./rng";
import {
  SANDBOX_WEALD_EMBARK_QUEST_IDS,
  type BasicQuestId,
  type CampaignLevel,
} from "../../data/src/basic-quests";
import type { ContentPackId } from "../../data/src/content-packs";
import { questsForCampaignLevel, questsForContentPacks } from "./campaign-quest-pool";

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

export function shuffleIds(ids: readonly string[], seed: number, cursor: number) {
  const rng = createRng(seed),
    deck = [...ids];
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    nextCursor++;
  }
  return { deck, cursor: nextCursor };
}

export function executeHamletQuestDrawMode(
  mode: HamletQuestDrawOptionId,
  seed: number,
  cursor: number,
  campaignLevel: CampaignLevel,
  contentPacks: readonly ContentPackId[] | undefined,
  currentQuestId: string,
  discarded: readonly string[],
):
  | { readonly offers: readonly BasicQuestId[]; readonly cursor: number }
  | { readonly reason: string } {
  const ruins = [
    ...remainingQuestIdsForLocationDeck(
      "ruins",
      campaignLevel,
      contentPacks,
      currentQuestId,
      discarded,
    ),
  ];
  const weald = [
    ...remainingQuestIdsForLocationDeck(
      "weald",
      campaignLevel,
      contentPacks,
      currentQuestId,
      discarded,
    ),
  ];
  if (mode === HAMLET_QUEST_DRAW_OPTION.ruinsTwo) {
    if (ruins.length < 2) return { reason: "遗迹任务堆剩余不足 2 张，无法按所选抽法抽牌（R33）" };
    const drawn = shuffleIds(ruins, seed, cursor);
    return { offers: drawn.deck.slice(0, 2) as BasicQuestId[], cursor: drawn.cursor };
  }
  if (mode === HAMLET_QUEST_DRAW_OPTION.wealdTwo) {
    if (weald.length < 2) return { reason: "Weald 任务堆剩余不足 2 张，无法按所选抽法抽牌（R33）" };
    const drawn = shuffleIds(weald, seed, cursor);
    return { offers: drawn.deck.slice(0, 2) as BasicQuestId[], cursor: drawn.cursor };
  }
  if (mode === HAMLET_QUEST_DRAW_OPTION.splitOneEach) {
    if (ruins.length < 1 || weald.length < 1)
      return { reason: "遗迹与 Weald 任务堆须各至少有 1 张，无法各抽 1（R33）" };
    const ruinsDrawn = shuffleIds(ruins, seed, cursor);
    const wealdDrawn = shuffleIds(weald, seed, ruinsDrawn.cursor);
    return {
      offers: [ruinsDrawn.deck[0]!, wealdDrawn.deck[0]!] as BasicQuestId[],
      cursor: wealdDrawn.cursor,
    };
  }
  return { reason: "任务抽法无效（R33）" };
}
