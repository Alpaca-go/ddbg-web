#!/usr/bin/env node
/**
 * Run the full local print-card-art export chain (Kyries EN_FILES → .cache).
 *
 *   node tools/pipeline/scripts/export-print-all.mjs \
 *     --input "C:\\Users\\kyrie\\Desktop\\DARKEST DUNGEON EN_FILES"
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function parseArgs(argv) {
  let input = "";
  let out = resolve(repoRoot, ".cache/print-card-art");
  let dpi = "200";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input" && argv[i + 1]) input = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--dpi" && argv[i + 1]) dpi = argv[++i];
  }
  if (!input) {
    console.error(
      "Usage: export-print-all.mjs --input <EN_FILES> [--out .cache/print-card-art] [--dpi 200]",
    );
    process.exit(1);
  }
  return { input, out, dpi };
}

function runNode(script, args) {
  const scriptPath = resolve(here, script);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    cwd: repoRoot,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const { input, out, dpi } = parseArgs(process.argv);
const common = ["--input", input, "--out", out];

runNode("export-print-card-art.mjs", [...common, "--dpi", dpi]);
runNode("export-print-room-tokens.mjs", [...common, "--dpi", "300"]);
runNode("export-print-hero-standees.mjs", [...common, "--dpi", "300"]);
runNode("export-print-corebox-trim-decks.mjs", [...common, "--dpi", dpi]);
runNode("export-print-room-tile-faces.mjs", [...common, "--dpi", dpi]);

runNode("build-print-monster-stance-art-map.mjs", ["--manifest", resolve(out, "manifest.csv")]);
runNode("build-print-room-tile-art-map.mjs");
runNode("check-print-art-map-refs.mjs", ["--cache", out]);

console.log(`Print-card-art export complete → ${out}`);
