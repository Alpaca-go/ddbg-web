#!/usr/bin/env node
/**
 * Promote room-token-export.json (or fixed slug convention) → apps/web card-art JSON.
 *
 * Usage:
 *   node tools/pipeline/scripts/build-print-room-token-art-map.mjs
 *   node tools/pipeline/scripts/build-print-room-token-art-map.mjs \
 *     --export .cache/print-card-art/room-token-export.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const REVEALED_KINDS = ["curio", "dark", "empty", "lair", "objective", "trap", "treasure"];

function parseArgs(argv) {
  let exportPath = resolve(repoRoot, ".cache/print-card-art/room-token-export.json");
  let out = resolve(repoRoot, "apps/web/src/card-art/room-token-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--export" && argv[i + 1]) exportPath = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { exportPath, out };
}

function slug(kind, face) {
  return `png/room-token-${kind}_${face}.png`;
}

function buildFromConvention() {
  const tokens = [];
  for (const kind of REVEALED_KINDS) {
    tokens.push({
      kind,
      face: "revealed",
      pngRel: slug(kind, "revealed"),
      primaryPdf: "DD_EN_COREBOX_PUNCHBOARD_200x300_BACK_V2.pdf",
      printPage: 3,
      imageXref: xrefForKind(kind),
      matchMethod: "rubine_diecut_bbox",
      reviewVerdict: "geometry_evidence_2026-10-19",
    });
  }
  tokens.push({
    kind: "door",
    face: "unrevealed",
    pngRel: slug("door", "unrevealed"),
    primaryPdf: "DD_EN_COREBOX_PUNCHBOARD_200x300_FRONT_V2.pdf",
    printPage: 3,
    imageXref: 192,
    matchMethod: "rubine_diecut_bbox",
    reviewVerdict: "geometry_evidence_2026-10-19",
  });
  return tokens;
}

function xrefForKind(kind) {
  const map = {
    treasure: 163,
    objective: 165,
    empty: 167,
    dark: 169,
    curio: 171,
    trap: 173,
    lair: 175,
  };
  return map[kind];
}

const { exportPath, out } = parseArgs(process.argv);
let tokens;
let exportNote = "pngRel slugs from export_room_tokens.py; run export then build.";
if (existsSync(exportPath)) {
  const data = JSON.parse(readFileSync(exportPath, "utf8"));
  tokens = (data.tokens || []).map((t) => ({
    kind: t.kind,
    face: t.face,
    pngRel: t.png_rel,
    primaryPdf: t.pdf_rel?.split("/").pop() ?? "",
    printPage: t.page,
    imageXref: t.image_xref,
    matchMethod: t.crop_method,
    reviewVerdict: "exported",
  }));
  exportNote = `Merged from ${exportPath.replace(repoRoot + "/", "")}`;
} else {
  tokens = buildFromConvention();
}

if (tokens.length !== 8) {
  console.error(`Expected 8 token rows (7 revealed + door), got ${tokens.length}`);
  process.exit(1);
}

const map = {
  schema: "ddbg.print-room-token-art-map.v1",
  source: {
    geometry:
      "PANTONE Rubine Red C Separation stroke, roundrect 61.37pt; punchboard 200x300 p3 (R-048)",
    exportScript: "tools/pipeline/print-card-art/export_room_tokens.py",
    notes: [
      exportNote,
      "Production raster should omit Separation plate; clip uses inset die-cut bbox.",
      "Bleed optional via export --crop bleed (~82.2pt fill disc from PDF).",
      "UI uses revealed kinds only; door face reserved for unrevealed presentation.",
    ],
    reviewedAt: "2026-10-19",
  },
  tokens,
  pendingConfirmation: [
    "COM punchboard room tokens not exported in this slice.",
    "Battle Room Tile faces: see room-tile-print-art-map.json (9 approved Ruins faces only).",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${tokens.length} tokens → ${out.replace(repoRoot + "/", "")}`);
