#!/usr/bin/env node
/**
 * Build Warrens extension monster print-art map from normalized IDs + export naming rules.
 *
 * Usage:
 *   node tools/pipeline/scripts/build-print-warrens-monster-art-map.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const out = resolve(repoRoot, "apps/web/src/card-art/warrens-monster-print-art-map.json");

const WAVE = "DARKEST_DUNGEON_PRINT_EN_WAVE 2";
const MG = "MG_DD_04_EN_WARRENS";

function pngSlug(pdfRel) {
  return pdfRel
    .replace(/\//g, "_")
    .replace(/ /g, "_")
    .replace(/\.pdf$/, ".pdf");
}

function loadCards(file) {
  return JSON.parse(readFileSync(resolve(repoRoot, file), "utf8")).cards;
}

const stems = {
  monster_medium: "DD_EN_WARRENS_CARDS_70_120_monsters_medium",
  monster_large: "DD_EN_WARRENS_CARDS_140x140_monster_large",
};

const cards = [];
for (const [category, stem] of Object.entries(stems)) {
  const norm = loadCards(`packages/data/normalized/extension/warrens/${category}.json`);
  for (const card of norm) {
    const primaryPage = card.pages[0];
    const frontPdf = `${WAVE}/${MG}/${stem}_FRONT.pdf`;
    const backPdf = `${WAVE}/${MG}/${stem}_BACK.pdf`;
    cards.push({
      id: card.id,
      name: card.name,
      level: card.level,
      category,
      face: "front",
      printPage: primaryPage,
      primaryPdf: `${stem}_FRONT`,
      pdfRel: frontPdf,
      pngRel: `png/${pngSlug(frontPdf)}_p${String(primaryPage).padStart(3, "0")}.png`,
      matchMethod: "page+normalized",
      reviewVerdict: "normalized",
    });
    cards.push({
      id: `${card.id}:back`,
      engineId: card.id,
      name: card.name,
      level: card.level,
      category,
      face: "back",
      printPage: primaryPage,
      primaryPdf: `${stem}_BACK`,
      pdfRel: backPdf,
      pngRel: `png/${pngSlug(backPdf)}_p${String(primaryPage).padStart(3, "0")}.png`,
      matchMethod: "page+normalized",
      reviewVerdict: "normalized",
    });
  }
}

const map = {
  schema: "ddbg.print-warrens-monster-art-map.v1",
  source: {
    normalized: [
      "packages/data/normalized/extension/warrens/monster_medium.json",
      "packages/data/normalized/extension/warrens/monster_large.json",
    ],
    printPack: "MG_DD_04_EN_WARRENS",
    notes: [
      "Page index aligns Warrens normalized `pages` with FRONT/BACK PDF sheets.",
      "pngRel paths are relative to .cache/print-card-art/ after export-print-card-art.mjs.",
      "Q-WARRENS-01/02: dual-sheet cards excluded from normalized are not listed here.",
    ],
    rowCount: cards.length,
  },
  cards,
  pendingConfirmation: [
    "Large Carrion Eater large p008 and Swinetaur medium p017 await print reconciliation (Q-WARRENS-01/02).",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(map, null, 2)}\n`, "utf8");
console.log(`Wrote ${cards.length} Warrens monster art rows → ${out}`);
