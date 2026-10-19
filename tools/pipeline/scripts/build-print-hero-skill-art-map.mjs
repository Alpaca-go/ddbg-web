#!/usr/bin/env node
/**
 * Promote Kyries-reviewed print hero skill CSV → apps/web card-art JSON map.
 *
 * Usage (repo root):
 *   node tools/pipeline/scripts/build-print-hero-skill-art-map.mjs \
 *     --csv tools/pipeline/print-card-art/fixtures/print-hero-skill-review-ok-all.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function parseArgs(argv) {
  let csv = resolve(
    repoRoot,
    "tools/pipeline/print-card-art/fixtures/print-hero-skill-review-ok-all.csv",
  );
  let out = resolve(repoRoot, "apps/web/src/card-art/hero-skill-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--csv" && argv[i + 1]) csv = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { csv, out };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    header.forEach((h, j) => {
      row[h] = cols[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function loadNormalizedIds(category) {
  const path = resolve(repoRoot, `packages/data/normalized/corebox/${category}.json`);
  const data = JSON.parse(readFileSync(path, "utf8"));
  return data.cards.map((c) => c.id);
}

const { csv, out } = parseArgs(process.argv);
const normalizedIds = loadNormalizedIds("hero_skill");
const expectedCount = normalizedIds.length;
const rows = parseCsv(readFileSync(csv, "utf8")).filter((r) => r.verdict === "ok");
if (rows.length !== expectedCount) {
  console.error(
    `Expected ${expectedCount} verdict=ok rows (normalized hero_skill), got ${rows.length}`,
  );
  process.exit(1);
}

const cards = rows.map((r) => ({
  id: r.engineId,
  name: r.name,
  level: Number(r.level),
  hero: r.hero,
  pngRel: r.pngRel,
  printPage: Number(r.printPage),
  primaryPdf: r.pdfBase,
  matchMethod: r.matchMethod,
  reviewVerdict: r.verdict,
}));

const covered = new Set(cards.map((c) => c.id));
const uncoveredEngineIds = normalizedIds.filter((id) => !covered.has(id));
if (uncoveredEngineIds.length) {
  console.error("Uncovered normalized hero_skill ids:", uncoveredEngineIds.join(", "));
  process.exit(1);
}

const map = {
  schema: "ddbg.print-hero-skill-art-map.v1",
  source: {
    csv: csv.replace(repoRoot + "/", "").replace(/\\/g, "/"),
    verdictFilter: "ok",
    rowCount: cards.length,
    notes: [
      "Human review CSV (Kyries); 231 core-box hero_skill cards on SKILLS_FRONT page order.",
      "pngRel paths are relative to .cache/print-card-art/ after export-print-card-art.mjs.",
      "Hero skill UI uses print PNG only (no TTS fallback); see resolve-print-hero-skill-art.ts.",
      "R-048: raster uses TrimBox / 3 mm bleed from print pipeline; no invented crop in UI.",
    ],
  },
  cards,
  uncoveredEngineIds,
  pendingConfirmation: uncoveredEngineIds.length
    ? [
        `${uncoveredEngineIds.length} normalized engine id(s) not in reviewed CSV (extension / out of scope).`,
      ]
    : [],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} cards → ${out.replace(repoRoot + "/", "")}`);
