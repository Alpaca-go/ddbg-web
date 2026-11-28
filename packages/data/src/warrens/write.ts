import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";
import { rawFileSchema } from "../shared/extract/raw";
import { buildWarrensPunchboard } from "./punchboard/punchboard.build";

export function loadNormalizedWarrensPunchboard() {
  return buildWarrensPunchboard(
    rawFileSchema.parse(readDataJson("extract/extension/warrens/raw/punchboard.json")),
  );
}

export function writeNormalizedWarrensPunchboard(
  outputDir = path.join(DATA_ROOT, "normalized/extension/warrens"),
) {
  const built = loadNormalizedWarrensPunchboard();
  writeDataFiles(outputDir, { "punchboard.json": built });
  return built;
}
