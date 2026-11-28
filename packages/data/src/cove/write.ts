import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildCoveCurios } from "./curios/curio.build";
import { buildCoveRooms } from "./rooms/room.build";
import { buildCoveRoomTiles } from "./tiles/room-tile.build";

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

const tileRaw = () =>
  rawFileSchema.parse(readDataJson("extract/extension/cove/raw/dungeon_tile.json"));

export function loadNormalizedCoveRoomTiles() {
  return buildCoveRoomTiles(tileRaw(), loadNormalizedCoveRooms().cards);
}

export function writeNormalizedCoveRoomTiles(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveRoomTiles();
  writeDataFiles(outputDir, { "room_tile_catalog.json": built });
  return built;
}
