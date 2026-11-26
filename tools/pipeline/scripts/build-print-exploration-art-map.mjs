#!/usr/bin/env node
/**
 * Promote Kyries-reviewed print exploration CSV → apps/web card-art JSON map.
 *
 * Usage (repo root):
 *   node tools/pipeline/scripts/build-print-exploration-art-map.mjs \
 *     --csv tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./lib/print-exploration-csv.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function parseArgs(argv) {
  let csv = resolve(
    repoRoot,
    "tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv",
  );
  let out = resolve(repoRoot, "apps/web/src/card-art/exploration-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--csv" && argv[i + 1]) csv = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { csv, out };
}

function loadRoomMeta() {
  const path = resolve(repoRoot, "packages/data/normalized/corebox/room.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  return new Map(data.cards.map((card) => [card.source.page, card]));
}

const { csv, out } = parseArgs(process.argv);
const legacyQuestArtIds = new Set([
  "quest:p001",
  "quest:p002",
  "quest:p003",
  "quest:p007",
  "quest:p008",
]);
const rows = parseCsv(readFileSync(csv, "utf8")).filter(
  (row) =>
    row.verdict === "ok" && (row.category !== "quest" || legacyQuestArtIds.has(row.engineId)),
);
if (rows.length !== 106) {
  throw new Error(`Expected 106 exploration rows, got ${rows.length}`);
}

const rooms = loadRoomMeta();

const cards = rows.map((r) => {
  const card = {
    id: r.engineId,
    name: r.name,
    category: r.category,
    pngRel: r.pngRel,
    printPage: Number(r.printPage),
    primaryPdf: r.primaryPdf,
    matchMethod: r.matchMethod,
    reviewVerdict: r.verdict,
  };
  if (r.category === "room") {
    const room = rooms.get(card.printPage);
    if (!room || room.name !== card.name || basename(room.source.front) !== card.primaryPdf) {
      throw new Error(`Room art row does not match the room catalog: ${r.engineId}`);
    }
    card.id = room.id;
    if (room.location === "ruins") card.boss = room.boss;
  }
  return card;
});

const uiCategories = new Set(["room", "quest_map"]);
const uiCardCount = cards.filter((c) => uiCategories.has(c.category)).length;
if (uiCardCount !== 39) {
  console.error(`Expected 39 UI room+quest_map cards, got ${uiCardCount}`);
  process.exit(1);
}

const map = {
  schema: "ddbg.print-exploration-art-map.v1",
  source: {
    csv: relative(repoRoot, csv).replace(/\\/g, "/"),
    verdictFilter: "ok",
    rowCount: cards.length,
    uiCardCount,
    reviewedAt: "2026-10-19",
    notes: [
      "Kyries 2026-10-19: skip human review page; PDF page-order exports trusted.",
      "pngRel paths are relative to .cache/print-card-art/ after export-print-card-art.mjs.",
      "Room cards + QuestMap UI use print PNG only (no TTS fallback); see resolve-exploration-art.ts.",
      "room_token: per-kind PNG via export_room_tokens.py + room-token-print-art-map.json.",
      "curio / trinket / quest UI uses dedicated print art maps (see docs/phases/phase4/phase4-print-curio-trinket-quest-art-2026-10-20.md).",
      "R-048: raster uses TrimBox / 3 mm bleed from print pipeline; no invented crop in UI.",
    ],
  },
  cards,
  pendingConfirmation: [
    "room_token per-kind PNG: see room-token-print-art-map.json.",
    "Battle Room Tile faces: see room-tile-print-art-map.json.",
    "QuestMap 边绑定 corridor_layout_bindings.json review=pending；核心盒无走廊板块（Q-161）。",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} cards (${uiCardCount} UI) → ${out.replace(repoRoot + "/", "")}`);
