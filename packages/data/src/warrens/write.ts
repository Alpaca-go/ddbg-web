import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWarrensStygianRooms } from "./rooms/stygian-rooms.build";

export function loadNormalizedWarrensStygianRooms() {
  return buildWarrensStygianRooms(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/stygian_room.json")),
  );
}

export function writeNormalizedWarrensStygianRooms(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensStygianRooms();
  writeDataFiles(outputDir, { "stygian_rooms.json": built });
  return built;
}
