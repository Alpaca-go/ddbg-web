#!/usr/bin/env node
/**
 * Export geometry-approved room tile faces (TrimBox page PNGs).
 *
 *   node tools/pipeline/scripts/export-print-room-tile-faces.mjs \
 *     --input "<EN_FILES>" --out .cache/print-card-art
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnPython } from "./lib/resolve-python.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const runPy = resolve(here, "../print-card-art/export_room_tile_faces.py");
const userArgs = process.argv.slice(2);

const result = spawnPython(runPy, userArgs, {
  stdio: "inherit",
  cwd: resolve(here, "../../.."),
});

if (result.error) {
  console.error(result.error.message);
  console.error("Install deps: pip install -r tools/pipeline/print-card-art/requirements.txt");
  process.exit(1);
}
process.exit(result.status ?? 1);
