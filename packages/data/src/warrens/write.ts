import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWarrensCurios } from "./curios/curio.build";
import { buildWarrensRooms } from "./rooms/room.build";
import { buildWarrensRoomTiles } from "./tiles/room-tile.build";

export function loadNormalizedWarrensCurios() {
  return buildWarrensCurios(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/curio.json")),
  );
}

export function writeNormalizedWarrensCurios(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensCurios();
  writeDataFiles(outputDir, { "curio.json": built });
  return built;
}

export function loadNormalizedWarrensRooms() {
  return buildWarrensRooms(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/room.json")),
  );
}

export function loadNormalizedWarrensRoomTiles() {
  return buildWarrensRoomTiles(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/dungeon_tile.json")),
  );
}

export function writeNormalizedWarrensRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const rooms = loadNormalizedWarrensRooms();
  const tiles = loadNormalizedWarrensRoomTiles();
  writeDataFiles(outputDir, { "room.json": rooms, "room_tile_geometry.json": tiles });
  return { rooms, tiles };
}
