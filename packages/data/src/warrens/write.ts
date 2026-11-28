import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWarrensLevelOneQuestCards } from "./quests/quest-cards.build";
import { buildWarrensHigherQuests } from "./quests/higher-quests.build";

export function loadNormalizedWarrensHigherQuests() {
  return buildWarrensHigherQuests(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/quest.json")),
  );
}

export function writeNormalizedWarrensHigherQuests(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensHigherQuests();
  writeDataFiles(outputDir, { "higher_quests.json": built });
  return built;
}

export function loadNormalizedWarrensLevelOneQuestCards() {
  return buildWarrensLevelOneQuestCards(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/quest.json")),
  );
}

export function writeNormalizedWarrensLevelOneQuestCards(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensLevelOneQuestCards();
  writeDataFiles(outputDir, { "quest_cards.json": built });
  return built;
}
