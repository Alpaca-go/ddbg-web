#!/usr/bin/env node
/**
 * Promote Kyries-reviewed print monster CSV → apps/web card-art JSON map.
 *
 * Usage (repo root):
 *   node tools/pipeline/scripts/build-print-monster-art-map.mjs \
 *     --csv tools/pipeline/print-card-art/fixtures/print-monster-review-ok-fixed-p021.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function parseArgs(argv) {
  let csv = resolve(
    repoRoot,
    "tools/pipeline/print-card-art/fixtures/print-monster-review-ok-fixed-p021.csv",
  );
  let out = resolve(repoRoot, "apps/web/src/card-art/monster-print-art-map.json");
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

/** Kyries 裁定：ADD_014 同名卡复用基础版印刷 PNG（仅怪物标记颜色小图标不同；不导 ADD PDF）。 */
const PRINT_MONSTER_ART_ALIASES = {
  "monster_medium:ADD_014:p001": "monster_medium:p106",
  "monster_medium:ADD_014:p003": "monster_medium:p109",
};

const { csv, out } = parseArgs(process.argv);
const rows = parseCsv(readFileSync(csv, "utf8")).filter((r) => r.verdict === "ok");
if (rows.length !== 72) {
  console.error(`Expected 72 verdict=ok rows, got ${rows.length}`);
  process.exit(1);
}

const cardsFromCsv = rows.map((r) => ({
  id: r.engineId,
  name: r.name,
  level: Number(r.level),
  category: r.category,
  pngRel: r.chosenPng,
  printPage: Number(r.primaryPage),
  primaryPdf: r.primaryPdf,
  matchMethod: r.primaryMethod,
  reviewVerdict: r.verdict,
  reviewedAt: r.reviewedAt,
}));

const byId = new Map(cardsFromCsv.map((c) => [c.id, c]));
const aliasCards = [];
for (const [aliasId, baseId] of Object.entries(PRINT_MONSTER_ART_ALIASES)) {
  const base = byId.get(baseId);
  if (!base) {
    console.error(`Alias base id missing from CSV: ${baseId} (for ${aliasId})`);
    process.exit(1);
  }
  aliasCards.push({
    ...base,
    id: aliasId,
    matchMethod: `reuse-base:${baseId}`,
    reviewVerdict: "alias",
  });
}

const cards = [...cardsFromCsv, ...aliasCards];

const covered = new Set(cards.map((c) => c.id));
const uncoveredEngineIds = [
  ...loadNormalizedIds("monster_medium"),
  ...loadNormalizedIds("monster_large"),
].filter((id) => !covered.has(id));

const map = {
  schema: "ddbg.print-monster-art-map.v1",
  source: {
    csv: csv.replace(repoRoot + "/", "").replace(/\\/g, "/"),
    verdictFilter: "ok",
    rowCount: cards.length,
    notes: [
      "Human review CSV (Kyries); includes corrected monsters_medium FRONT p021 → Cultist Acolyte.",
      "ADD_014 medium monsters reuse base print PNG via PRINT_MONSTER_ART_ALIASES (2026-10-20 Kyries).",
      "pngRel paths are relative to .cache/print-card-art/ after export-print-card-art.mjs.",
      "Monster UI uses print PNG only (no TTS fallback); see resolve-monster-art.ts.",
      "R-048: raster uses TrimBox / 3 mm bleed from print pipeline; no invented crop in UI.",
    ],
    reviewedCsvRowCount: cardsFromCsv.length,
    aliasRowCount: aliasCards.length,
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
if (uncoveredEngineIds.length) {
  console.log("Uncovered:", uncoveredEngineIds.join(", "));
}
