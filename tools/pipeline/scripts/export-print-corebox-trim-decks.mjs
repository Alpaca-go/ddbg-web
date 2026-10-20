#!/usr/bin/env node
/**
 * Node wrapper → Python corebox curio/trinket/quest TrimBox exporter.
 *
 *   node tools/pipeline/scripts/export-print-corebox-trim-decks.mjs \
 *     --input "/path/to/DARKEST DUNGEON EN_FILES" \
 *     --out .cache/print-card-art
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const runPy = resolve(here, "../print-card-art/export_corebox_trim_decks.py");
const userArgs = process.argv.slice(2);

const result = spawnSync("python3", [runPy, ...userArgs], {
  stdio: "inherit",
  cwd: resolve(here, "../../.."),
});

if (result.error) {
  console.error(result.error.message);
  console.error("Install deps: pip install -r tools/pipeline/print-card-art/requirements.txt");
  process.exit(1);
}
process.exit(result.status ?? 1);
