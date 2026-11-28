import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildCoveCurios } from "./curios/curio.build";
import { buildCoveRooms } from "./rooms/room.build";
import { buildCoveStygianRooms } from "./rooms/stygian-rooms.build";

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

export function loadNormalizedCoveStygianRooms() {
  const roomRaw = rawFileSchema.parse(readDataJson("extract/extension/cove/raw/room.json"));
  return buildCoveStygianRooms(
    rawFileSchema.parse(readDataJson("extract/extension/cove/raw/stygian_room.json")),
    buildCoveRooms(roomRaw),
  );
}

export function writeNormalizedCoveStygianRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveStygianRooms();
  writeDataFiles(outputDir, { "stygian_rooms.json": built });
  return built;
}
