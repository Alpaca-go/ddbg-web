import {
  normalizeContentPacks,
  type ContentPackId,
} from "../../../../data/src/shared/content-packs";
import {
  createCoreDungeonQuest,
  type CoreQuestSources,
  type QuestParty,
} from "../dungeon/dungeon-quest-entry";
import type { BasicQuestId } from "../../../../data/src/core/quests/basic-quests";
import type { DungeonState } from "../dungeon/dungeon";
import type { HamletQuestDrawOptionId } from "./hamlet-location-quest-draw";

/** 正式新战役入口。旧的单任务/测试入口保留原目录用于旧档严格重放。 */
export function createCampaignQuest(
  seed: number,
  questId: BasicQuestId,
  mode: DungeonState["mode"],
  party: QuestParty,
  sources: CoreQuestSources,
  packs: readonly ContentPackId[] = ["core"],
  initialQuestDrawMode?: HamletQuestDrawOptionId,
  wealdHigherQuestOffers?: true | "tasks-v1",
) {
  return createCoreDungeonQuest(
    seed,
    questId,
    mode,
    party,
    sources,
    true,
    "full",
    normalizeContentPacks(packs),
    initialQuestDrawMode,
    undefined,
    wealdHigherQuestOffers,
  );
}
