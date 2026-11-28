import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { loadIconDictionary } from "../shared/dictionary/load";
import { rawFileSchema } from "../shared/extract/raw";
import { buildCoveCurios } from "./curios/curio.build";
import { buildCoveHigherMonsters, buildCoveLevelOneMonsters } from "./monsters/monsters.build";
import { buildCoveRooms } from "./rooms/room.build";

export function loadNormalizedCoveCurios() {
  return buildCoveCurios(
    rawFileSchema.parse(readDataJson("extract/extension/cove/raw/curio.json")),
  );
}

export function writeNormalizedCoveCurios(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveCurios();
  writeDataFiles(outputDir, { "curio.json": built });
  return built;
}

const roomRaw = () => rawFileSchema.parse(readDataJson("extract/extension/cove/raw/room.json"));

export function loadNormalizedCoveRooms() {
  return buildCoveRooms(roomRaw());
}

export function writeNormalizedCoveRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const rooms = loadNormalizedCoveRooms();
  writeDataFiles(outputDir, { "room.json": rooms });
  return rooms;
}

export function loadNormalizedCoveLevelOneMonsters() {
  const source = "extract/extension/cove";
  return buildCoveLevelOneMonsters({
    mediumRaw: rawFileSchema.parse(readDataJson(`${source}/raw/monster_medium.json`)),
    largeRaw: rawFileSchema.parse(readDataJson(`${source}/raw/monster_large.json`)),
    mediumParsed: readDataJson(`${source}/parsed/monster_medium.json`),
    largeParsed: readDataJson(`${source}/parsed/monster_large.json`),
    dictionary: loadIconDictionary(),
  });
}

export function writeNormalizedCoveLevelOneMonsters(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveLevelOneMonsters();
  writeDataFiles(outputDir, {
    "monster_medium.json": built.monster_medium,
    "monster_large.json": built.monster_large,
  });
  return built;
}

export function loadNormalizedCoveHigherMonsters() {
  const source = "extract/extension/cove";
  return buildCoveHigherMonsters({
    mediumRaw: rawFileSchema.parse(readDataJson(`${source}/raw/monster_medium.json`)),
    largeRaw: rawFileSchema.parse(readDataJson(`${source}/raw/monster_large.json`)),
    mediumParsed: readDataJson(`${source}/parsed/monster_medium.json`),
    largeParsed: readDataJson(`${source}/parsed/monster_large.json`),
    dictionary: loadIconDictionary(),
  });
}

export function writeNormalizedCoveHigherMonsters(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveHigherMonsters();
  writeDataFiles(outputDir, {
    "monster_medium_higher.json": built.monster_medium,
    "monster_large_higher.json": built.monster_large,
  });
  return built;
}
