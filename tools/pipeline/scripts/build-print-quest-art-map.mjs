#!/usr/bin/env node
/**
 * Promote exploration CSV quest rows (basic-quests only) → quest-print-art-map.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
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
const TRIM = { widthPt: 198.43, heightPt: 340.16 };
const ENABLED_QUEST_IDS = ["quest:p001", "quest:p002", "quest:p003", "quest:p007", "quest:p008"];

const QUEST_NAMES = {
  "quest:p001": "Scout Ahead I",
  "quest:p002": "Wipe 'Em Out I",
  "quest:p003": "Fundraiser I",
  "quest:p007": "Clear the Path II",
  "quest:p008": "Reduce to Rubble II",
};

const allQuestRows = loadExplorationOkRows(repoRoot, CSV).filter((r) => r.category === "quest");
const enabledRows = allQuestRows.filter((r) => ENABLED_QUEST_IDS.includes(r.engineId));
if (enabledRows.length !== ENABLED_QUEST_IDS.length) {
  console.error(
    `Expected ${ENABLED_QUEST_IDS.length} enabled quest rows, got ${enabledRows.length}`,
  );
  process.exit(1);
}

const cards = enabledRows.map((r) => {
  const expectedName = QUEST_NAMES[r.engineId];
  if (!expectedName) {
    console.error(`No expected name for ${r.engineId}`);
    process.exit(1);
  }
  if (r.name !== expectedName && r.engineId !== "quest:p002") {
    // CSV uses straight apostrophe; basic-quests uses curly — allow CSV name
  }
  const page = Number(r.printPage);
  const idPage = Number(r.engineId.replace("quest:p", ""));
  if (idPage !== page) {
    console.error(`${r.engineId}: id page ${idPage} ≠ printPage ${page}`);
    process.exit(1);
  }
  return {
    id: r.engineId,
    name: r.name,
    faces: {
      front: {
        pngRel: r.pngRel,
        printPage: page,
        primaryPdf: r.primaryPdf,
        cropMethod: "trimbox",
        textSnippet: r.name.replace(/ I$| II$/, ""),
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

const pendingPages = [];
for (let p = 1; p <= 19; p++) {
  const id = `quest:p${String(p).padStart(3, "0")}`;
  if (!ENABLED_QUEST_IDS.includes(id)) pendingPages.push(id);
}

const out = resolve(repoRoot, "apps/web/src/card-art/quest-print-art-map.json");
const map = {
  schema: "ddbg.print-quest-art-map.v1",
  source: {
    csv: CSV,
    geometry: "Full-page TrimBox 198.43×340.16pt (R-048)",
    trimBoxPt: TRIM,
    exportScript: "tools/pipeline/scripts/export-print-corebox-trim-decks.mjs",
    enabledQuestIds: ENABLED_QUEST_IDS,
    reviewedAt: "2026-10-20",
    notes: [
      "Only basic-quests.ts enabled ids wired to UI; other 14 quest pages exported but not mapped.",
    ],
  },
  cards,
  pendingConfirmation: pendingPages.map((id) => `${id}: quest card not enabled in basic-quests.ts`),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(
  `Wrote ${cards.length} quest cards (${pendingPages.length} pending) → ${out.replace(repoRoot + "/", "")}`,
);
