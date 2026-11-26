import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { iconDictionarySchema } from "../shared/dictionary/schema";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWealdLevelOneMonsters } from "./monsters/monsters.build";
import { buildWealdCurios } from "./curios/curio.build";
import { buildWealdRooms } from "./rooms/room.build";
import { buildWealdRoomTiles } from "./tiles/room-tile.build";
import { buildWealdStygianRooms } from "./rooms/stygian-rooms.build";
import { buildWealdLevelOneQuestCards } from "./quests/quest-cards.build";
import { buildWealdHigherQuests } from "./quests/higher-quests.build";

export function loadNormalizedWealdHigherQuests() {
  return buildWealdHigherQuests(
    rawFileSchema.parse(readDataJson("extract/extension/weald/raw/quest.json")),
  );
}

export function writeNormalizedWealdHigherQuests(
  outputDir = path.join(DATA_ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdHigherQuests();
  writeDataFiles(outputDir, { "higher_quests.json": built });
  return built;
}

export function loadNormalizedWealdCurios() {
  return buildWealdCurios(
    rawFileSchema.parse(readDataJson("extract/extension/weald/raw/curio.json")),
  );
}

export function writeNormalizedWealdCurios(
  outputDir = path.join(DATA_ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdCurios();
  writeDataFiles(outputDir, { "curio.json": built });
  return built;
}

export function loadNormalizedWealdLevelOneMonsters() {
  const source = "extract/extension/weald";
  return buildWealdLevelOneMonsters({
    mediumRaw: rawFileSchema.parse(readDataJson(`${source}/raw/monster_medium.json`)),
    largeRaw: rawFileSchema.parse(readDataJson(`${source}/raw/monster_large.json`)),
    mediumParsed: readDataJson(`${source}/parsed/monster_medium.json`),
    largeParsed: readDataJson(`${source}/parsed/monster_large.json`),
    dictionary: iconDictionarySchema.parse(readDataJson("dictionary/icon-dictionary-v1.8.json")),
  });
}

export function writeNormalizedWealdLevelOneMonsters(
  outputDir = path.join(DATA_ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdLevelOneMonsters();
  writeDataFiles(outputDir, {
    "monster_medium.json": built.monster_medium,
    "monster_large.json": built.monster_large,
  });
  return built;
}

export function loadNormalizedWealdRooms() {
  const raw = rawFileSchema.parse(readDataJson("extract/extension/weald/raw/room.json"));
  return {
    rooms: buildWealdRooms(raw),
    tiles: buildWealdRoomTiles(),
  };
}

export function loadNormalizedWealdStygianRooms() {
  const roomRaw = rawFileSchema.parse(readDataJson("extract/extension/weald/raw/room.json"));
  return buildWealdStygianRooms(
    rawFileSchema.parse(readDataJson("extract/extension/weald/raw/stygian_room.json")),
    buildWealdRooms(roomRaw),
  );
}

export function writeNormalizedWealdStygianRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdStygianRooms();
  writeDataFiles(outputDir, { "stygian_rooms.json": built });
  return built;
}

export function loadNormalizedWealdLevelOneQuestCards() {
  return buildWealdLevelOneQuestCards(
    rawFileSchema.parse(readDataJson("extract/extension/weald/raw/quest.json")),
  );
}

export function writeNormalizedWealdLevelOneQuestCards(
  outputDir = path.join(DATA_ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdLevelOneQuestCards();
  writeDataFiles(outputDir, { "quest_cards.json": built });
  return built;
}

export function writeNormalizedWealdRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdRooms();
  writeDataFiles(outputDir, { "room.json": built.rooms, "room_tile_geometry.json": built.tiles });
  return built;
}
