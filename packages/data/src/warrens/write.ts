import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWarrensBossRooms } from "./rooms/boss-rooms.build";

export function loadNormalizedWarrensBossRooms() {
  return buildWarrensBossRooms(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/room.json")),
  );
}

export function writeNormalizedWarrensBossRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensBossRooms();
  writeDataFiles(outputDir, { "boss_rooms.json": built });
  return built;
}
