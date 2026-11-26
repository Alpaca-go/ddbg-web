#!/usr/bin/env node
/**
 * Promote exploration CSV curio rows → apps/web curio-print-art-map.json
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
const TRIM = {
  widthPt: 178.58,
  heightPt: 249.45,
  x0Pt: 21,
  y0Pt: 21,
  x1Pt: 199.58,
  y1Pt: 270.45,
};

const curioData = JSON.parse(
  readFileSync(resolve(repoRoot, "packages/data/normalized/corebox/curio.json"), "utf8"),
);
const normalizedById = new Map(curioData.cards.map((c) => [c.id, c]));

const rows = loadExplorationOkRows(repoRoot, CSV).filter((r) => r.category === "curio");
if (rows.length !== 24) {
  console.error(`Expected 24 curio rows, got ${rows.length}`);
  process.exit(1);
}

const cards = rows.map((r) => {
  const norm = normalizedById.get(r.engineId);
  if (!norm) {
    console.error(`Missing normalized curio ${r.engineId}`);
    process.exit(1);
  }
  if (norm.source.page !== Number(r.printPage)) {
    console.error(`${r.engineId}: normalized page ${norm.source.page} ≠ CSV ${r.printPage}`);
    process.exit(1);
  }
  if (norm.name !== r.name) {
    console.error(`${r.engineId}: normalized name "${norm.name}" ≠ CSV "${r.name}"`);
    process.exit(1);
  }
  const page = Number(r.printPage);
  return {
    id: r.engineId,
    name: r.name,
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

const out = resolve(repoRoot, "apps/web/src/card-art/curio-print-art-map.json");
const map = {
  schema: "ddbg.print-curio-art-map.v1",
  source: {
    csv: CSV,
    geometry: "Full-page TrimBox per card (21,21)-(199.58,270.45) = 178.58×249.45pt (R-048)",
    trimBoxPt: TRIM,
    exportScript: "tools/pipeline/scripts/export-print-corebox-trim-decks.mjs",
    reviewedAt: "2026-10-20",
    notes: [
      "Page n → curio:p0nn; FRONT V2 + BACK PDFs各 24 页。",
      "pngRel paths relative to .cache/print-card-art after export.",
    ],
  },
  cards,
  pendingConfirmation: [],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} curio cards → ${out.replace(repoRoot + "/", "")}`);
