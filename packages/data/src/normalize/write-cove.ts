import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rawFileSchema } from "../extract/raw";
import { buildCoveCurios } from "./cove-curios";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string): unknown =>
  JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as unknown;

export function loadNormalizedCoveCurios() {
  return buildCoveCurios(rawFileSchema.parse(read("extract/extension/cove/raw/curio.json")));
}

export function writeNormalizedCoveCurios(
  outputDir = path.join(ROOT, "normalized/extension/cove"),
) {
  const built = loadNormalizedCoveCurios();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "curio.json"), `${JSON.stringify(built, null, 1)}\n`);
  return built;
}
