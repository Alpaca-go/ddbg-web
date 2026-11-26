#!/usr/bin/env node
/**
 * Verify relative PNG paths in apps/web *-print-art-map.json exist under the print cache.
 */
import { readFileSync, existsSync, globSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function parseArgs(argv) {
  let cache = resolve(repoRoot, ".cache/print-card-art");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--cache" && argv[i + 1]) cache = resolve(repoRoot, argv[++i]);
  }
  return { cache, includeManual: argv.includes("--include-manual") };
}

function collectPngRels(node, out) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) collectPngRels(item, out);
    return;
  }
  if (typeof node !== "object") return;
  for (const rel of [node.pngRel, node.facePngRel]) {
    if (typeof rel === "string" && /^(?:png|manual)\//.test(rel)) out.add(rel);
  }
  for (const value of Object.values(node)) {
    collectPngRels(value, out);
  }
}

const { cache, includeManual } = parseArgs(process.argv);
const mapDir = resolve(repoRoot, "apps/web/src/card-art");
const maps = globSync("*-print-art-map.json", { cwd: mapDir }).map((f) => resolve(mapDir, f));

const missing = [];
for (const mapPath of maps) {
  const data = JSON.parse(readFileSync(mapPath, "utf8"));
  const pngRels = new Set();
  collectPngRels(data, pngRels);
  for (const pngRel of pngRels) {
    if (!includeManual && pngRel.startsWith("manual/hamlet-building-tiles/")) continue;
    const abs = resolve(cache, pngRel);
    if (!existsSync(abs)) {
      missing.push({ map: mapPath.replace(repoRoot + "/", ""), pngRel });
    }
  }
}

if (missing.length) {
  console.error(`Missing ${missing.length} PNG(s) under ${cache}:`);
  for (const row of missing.slice(0, 40)) {
    console.error(`  ${row.map}: ${row.pngRel}`);
  }
  if (missing.length > 40) {
    console.error(`  … and ${missing.length - 40} more`);
  }
  process.exit(1);
}

console.log(
  `OK: ${maps.length} map file(s), all pngRel targets exist under ${cache.replace(repoRoot + "/", "")}`,
);
