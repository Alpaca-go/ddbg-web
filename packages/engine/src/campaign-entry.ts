import { normalizeContentPacks, type ContentPackId } from "../../data/src/content-packs";
import {
  createCoreDungeonQuest,
  type CoreQuestSources,
  type QuestParty,
} from "./dungeon-quest-entry";
import type { BasicQuestId } from "../../data/src/basic-quests";
import type { DungeonState } from "./dungeon";

/** 正式新战役入口。旧的单任务/测试入口保留原目录用于旧档严格重放。 */
export function createCampaignQuest(
  seed: number,
  questId: BasicQuestId,
  mode: DungeonState["mode"],
  party: QuestParty,
  sources: CoreQuestSources,
  packs: readonly ContentPackId[] = ["core"],
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
  );
}
