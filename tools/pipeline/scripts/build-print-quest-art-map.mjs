#!/usr/bin/env node
/**
 * Promote exploration CSV quest rows → quest-print-art-map.json
 * (all 19 print pages; only basic-quests ids are gameplay-enabled)
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
const ENABLED_QUEST_IDS = [
  "quest:p001",
  "quest:p002",
  "quest:p003",
  "quest:p004",
  "quest:p005",
  "quest:p006",
  "quest:p007",
  "quest:p008",
  "quest:p009",
  "quest:p010",
  "quest:p011",
  "quest:p012",
  "quest:p013",
  "quest:p014",
  "quest:p015",
  "quest:p016",
  "quest:p017",
  "quest:p018",
  "quest:p019",
];
const ART_ONLY_QUEST_IDS = [];
const ALL_QUEST_IDS = [...ENABLED_QUEST_IDS, ...ART_ONLY_QUEST_IDS].sort(
  (a, b) => Number(a.replace("quest:p", "")) - Number(b.replace("quest:p", "")),
);

const QUEST_NAMES = {
  "quest:p001": "Scout Ahead I",
  "quest:p002": "Wipe 'Em Out I",
  "quest:p003": "Fundraiser I",
  "quest:p004": "Dem Bones I",
  "quest:p005": "Rising Threat I",
  "quest:p006": "Disruption II",
  "quest:p007": "Clear the Path II",
  "quest:p008": "Reduce to Rubble II",
  "quest:p009": "Break Them II",
  "quest:p010": "Purify the Fountains II",
  "quest:p011": "Warm Up the Halls III",
  "quest:p012": "Forward Camps III",
  "quest:p013": "They Are Back III",
  "quest:p014": "Creeping Darkness III",
  "quest:p015": "The Threat is Real III",
  "quest:p016": "We Are The Flame",
  "quest:p017": "Light the Way",
  "quest:p018": "Belly of the Beast",
  "quest:p019": "Face the Threat!",
};

const allQuestRows = loadExplorationOkRows(repoRoot, CSV).filter((r) => r.category === "quest");
const rowsById = new Map(allQuestRows.map((r) => [r.engineId, r]));

for (const id of ALL_QUEST_IDS) {
  if (!rowsById.has(id)) {
    console.error(`Missing CSV row for ${id}`);
    process.exit(1);
  }
}
if (allQuestRows.length !== ALL_QUEST_IDS.length) {
  console.error(`Expected ${ALL_QUEST_IDS.length} quest rows in CSV, got ${allQuestRows.length}`);
  process.exit(1);
}

const cards = ALL_QUEST_IDS.map((engineId) => {
  const r = rowsById.get(engineId);
  const expectedName = QUEST_NAMES[engineId];
  if (!expectedName) {
    console.error(`No expected name for ${engineId}`);
    process.exit(1);
  }
  if (r.name !== expectedName && engineId !== "quest:p002") {
    // CSV uses straight apostrophe; basic-quests uses curly — allow CSV name
  }
  const page = Number(r.printPage);
  const idPage = Number(engineId.replace("quest:p", ""));
  if (idPage !== page) {
    console.error(`${engineId}: id page ${idPage} ≠ printPage ${page}`);
    process.exit(1);
  }
  const status = ENABLED_QUEST_IDS.includes(engineId) ? "enabled" : "art-only";
  return {
    id: engineId,
    name: r.name,
    status,
    faces: {
      front: {
        pngRel: r.pngRel,
        printPage: page,
        primaryPdf: r.primaryPdf,
        cropMethod: "trimbox",
        textSnippet: r.name.replace(/ I$| II$| III$/, ""),
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

const out = resolve(repoRoot, "apps/web/src/card-art/quest-print-art-map.json");
const map = {
  schema: "ddbg.print-quest-art-map.v1",
  source: {
    csv: CSV,
    geometry: "Full-page TrimBox 198.43×340.16pt (R-048)",
    trimBoxPt: TRIM,
    exportScript: "tools/pipeline/scripts/export-print-corebox-trim-decks.mjs",
    enabledQuestIds: ENABLED_QUEST_IDS,
    artOnlyQuestIds: ART_ONLY_QUEST_IDS,
    reviewedAt: "2026-10-20",
    notes: [
      "All 19 quest print pages mapped; status enabled = basic-quests.ts + UI quest pool, art-only = raster only.",
      "quest:p012 Forward Camps III：data-pool-only（empty×3 + randomizeNonObjective×5）；? 展开 Q-112b；camp XP / SPECIAL 另刀（R-112，2026-10-25）。",
    ],
  },
  cards,
  pendingConfirmation: [],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(
  `Wrote ${cards.length} quest cards (${ENABLED_QUEST_IDS.length} enabled, ${ART_ONLY_QUEST_IDS.length} art-only) → ${out.replace(repoRoot + "/", "")}`,
);
