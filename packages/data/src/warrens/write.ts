import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { loadIconDictionary } from "../shared/dictionary/load";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWarrensNormalMonsters } from "./monsters/monsters.build";

const SOURCE = "extract/extension/warrens";

export function loadNormalizedWarrensNormalMonsters() {
  return buildWarrensNormalMonsters({
    mediumRaw: rawFileSchema.parse(readDataJson(`${SOURCE}/raw/monster_medium.json`)),
    largeRaw: rawFileSchema.parse(readDataJson(`${SOURCE}/raw/monster_large.json`)),
    mediumParsed: readDataJson(`${SOURCE}/parsed/monster_medium.json`),
    largeParsed: readDataJson(`${SOURCE}/parsed/monster_large.json`),
    dictionary: loadIconDictionary(),
  });
}

export function writeNormalizedWarrensNormalMonsters(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensNormalMonsters();
  writeDataFiles(outputDir, {
    "monster_medium.json": built.monster_medium,
    "monster_large.json": built.monster_large,
  });
  return built;
}
