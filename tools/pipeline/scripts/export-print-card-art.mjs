#!/usr/bin/env node
/**
 * Thin Node CLI → Python print-card-art batch exporter.
 *
 * Usage:
 *   node tools/pipeline/scripts/export-print-card-art.mjs \
 *     --input "C:\\Users\\kyrie\\Desktop\\DARKEST DUNGEON EN_FILES" \
 *     --out .cache/print-card-art
 *
 * Requires: Python 3.10+ (see DDBG_PYTHON) + pip install -r tools/pipeline/print-card-art/requirements.txt
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnPython } from "./lib/resolve-python.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const runPy = resolve(here, "../print-card-art/run.py");
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
