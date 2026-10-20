#!/usr/bin/env node
/**
 * Promote exploration CSV trinket rows → apps/web trinket-print-art-map.json
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadExplorationOkRows,
  backPdfFromFront,
  backPngRelFromFront,
} from "./lib/print-exploration-csv.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const CSV = "tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv";
const TRIM = { widthPt: 192.76, heightPt: 124.72, landscape: true };

function backLevelForPage(page) {
  if (page >= 1 && page <= 14) return 1;
  if (page >= 15 && page <= 26) return 2;
  if (page >= 27 && page <= 38) return 3;
  throw new Error(`Trinket page ${page} outside back tiers`);
}

const trinketData = JSON.parse(
  readFileSync(resolve(repoRoot, "packages/data/normalized/corebox/trinket.json"), "utf8"),
);
const normalizedById = new Map(trinketData.cards.map((c) => [c.id, c]));

const rows = loadExplorationOkRows(repoRoot, CSV).filter((r) => r.category === "trinket");
if (rows.length !== 38) {
  console.error(`Expected 38 trinket rows, got ${rows.length}`);
  process.exit(1);
}

const cards = rows.map((r) => {
  const norm = normalizedById.get(r.engineId);
  if (!norm) {
    console.error(`Missing normalized trinket ${r.engineId}`);
    process.exit(1);
  }
  const page = Number(r.printPage);
  const expectedPage = norm.pages?.[0] ?? page;
  if (expectedPage !== page) {
    console.error(`${r.engineId}: normalized page ${expectedPage} ≠ CSV ${page}`);
    process.exit(1);
  }
  if (norm.name !== r.name) {
    console.error(`${r.engineId}: normalized name "${norm.name}" ≠ CSV "${r.name}"`);
    process.exit(1);
  }
  const tier = backLevelForPage(page);
  if (norm.back_level !== tier) {
    console.error(`${r.engineId}: back_level ${norm.back_level} ≠ tier ${tier} for page ${page}`);
    process.exit(1);
  }
  return {
    id: r.engineId,
    name: r.name,
    level: norm.level,
    backLevel: norm.back_level,
    faces: {
      front: {
        pngRel: r.pngRel,
        printPage: page,
        primaryPdf: r.primaryPdf,
        cropMethod: "trimbox",
        textSnippet: r.name,
      },
      back: {
        pngRel: backPngRelFromFront(r.pngRel),
        printPage: page,
        primaryPdf: backPdfFromFront(r.primaryPdf),
        cropMethod: "trimbox",
        textSnippet: r.name,
      },
    },
    matchMethod: r.matchMethod,
    reviewVerdict: r.verdict,
  };
});

const out = resolve(repoRoot, "apps/web/src/card-art/trinket-print-art-map.json");
const map = {
  schema: "ddbg.print-trinket-art-map.v1",
  source: {
    csv: CSV,
    geometry: "Full-page TrimBox 192.76×124.72pt landscape; whole card, not half-split (R-048)",
    trimBoxPt: TRIM,
    backTierPages: { I: "1–14", II: "15–26", III: "27–38" },
    exportScript: "tools/pipeline/scripts/export-print-corebox-trim-decks.mjs",
    reviewedAt: "2026-10-20",
    notes: [
      "Page n → trinket:p0nn; BACK tier by back_level matches print page ranges.",
      "UI shows full card raster; upright/inverted is presentation only.",
    ],
  },
  cards,
  pendingConfirmation: [],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} trinket cards → ${out.replace(repoRoot + "/", "")}`);
