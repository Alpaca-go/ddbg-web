import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconDictionarySchema } from "../dictionary/schema";
import { rawFileSchema } from "../extract/raw";
import { buildWealdLevelOneMonsters } from "./weald-monsters";
import { buildWealdCurios } from "./weald-curios";
import { buildWealdRooms, buildWealdRoomTiles } from "./weald-rooms";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string): unknown =>
  JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as unknown;

export function loadNormalizedWealdCurios() {
  return buildWealdCurios(rawFileSchema.parse(read("extract/extension/weald/raw/curio.json")));
}

export function writeNormalizedWealdCurios(
  outputDir = path.join(ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdCurios();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "curio.json"), `${JSON.stringify(built, null, 1)}\n`);
  return built;
}

export function loadNormalizedWealdLevelOneMonsters() {
  const source = "extract/extension/weald";
  return buildWealdLevelOneMonsters({
    mediumRaw: rawFileSchema.parse(read(`${source}/raw/monster_medium.json`)),
    largeRaw: rawFileSchema.parse(read(`${source}/raw/monster_large.json`)),
    mediumParsed: read(`${source}/parsed/monster_medium.json`),
    largeParsed: read(`${source}/parsed/monster_large.json`),
    dictionary: iconDictionarySchema.parse(read("dictionary/icon-dictionary-v1.8.json")),
  });
}

export function writeNormalizedWealdLevelOneMonsters(
  outputDir = path.join(ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdLevelOneMonsters();
  mkdirSync(outputDir, { recursive: true });
  for (const [name, file] of Object.entries(built)) {
    writeFileSync(path.join(outputDir, `${name}.json`), `${JSON.stringify(file, null, 1)}\n`);
  }
  return built;
}

export function loadNormalizedWealdRooms() {
  const raw = rawFileSchema.parse(read("extract/extension/weald/raw/room.json"));
  return {
    rooms: buildWealdRooms(raw),
    tiles: buildWealdRoomTiles(),
  };
}

export function writeNormalizedWealdRooms(
  outputDir = path.join(ROOT, "normalized/extension/weald"),
) {
  const built = loadNormalizedWealdRooms();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "room.json"), `${JSON.stringify(built.rooms, null, 1)}\n`);
  writeFileSync(
    path.join(outputDir, "room_tile_geometry.json"),
    `${JSON.stringify(built.tiles, null, 1)}\n`,
  );
  return built;
}
