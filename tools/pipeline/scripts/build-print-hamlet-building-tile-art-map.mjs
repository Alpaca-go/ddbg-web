#!/usr/bin/env node
/**
 * Promote hamlet-building-tile-export.json → hamlet-building-tile-print-art-map.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const HINTS = JSON.parse(
  readFileSync(
    resolve(
      repoRoot,
      "tools/pipeline/print-card-art/fixtures/hamlet-building-tile-bld-p1-hints.json",
    ),
    "utf8",
  ),
);

const UPGRADABLE = [
  "abbey",
  "tavern",
  "sanitarium",
  "survivalist",
  "stagecoach",
  "blacksmith",
  "nomadWagon",
];

function parseArgs(argv) {
  let exportPath = resolve(repoRoot, ".cache/print-card-art/hamlet-building-tile-export.json");
  let out = resolve(repoRoot, "apps/web/src/card-art/hamlet-building-tile-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--export" && argv[i + 1]) exportPath = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { exportPath, out };
}

function slugFor(buildingId, level) {
  const safe = buildingId.replace(/([A-Z])/g, (c) => c.toLowerCase());
  return `png/hamlet-building-${safe}_L${level}.png`;
}

const { exportPath, out } = parseArgs(process.argv);
let tiles;
let exportNote = "pngRel slugs from export_hamlet_building_tiles.py";
if (existsSync(exportPath)) {
  const data = JSON.parse(readFileSync(exportPath, "utf8"));
  tiles = (data.tiles || []).map((t) => ({
    buildingId: t.building_id,
    level: t.level,
    printName: t.print_name,
    printLevel: t.print_level,
    pngRel: t.png_rel,
    primaryPdf: t.pdf_rel?.split("/").pop() ?? "DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf",
    printPage: t.page,
    formXref: t.form_xref,
    formName: t.form_name,
    diecutPt: t.diecut_pt,
    panelLongPt: t.panel_long_pt,
    panelShortPt: t.panel_short_pt,
    textSnippet: t.text_snippet,
    cropMethod: t.crop_method,
    matchMethod: t.match_method,
    reviewVerdict: "exported",
  }));
  exportNote = `Merged from ${exportPath.replace(repoRoot + "/", "")}`;
} else {
  tiles = HINTS.tiles.map((t) => ({
    buildingId: t.buildingId,
    level: t.level,
    pngRel: slugFor(t.buildingId, t.level),
    primaryPdf: "DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf",
    printPage: 1,
    diecutPt: t.diecutPt,
    verifyPhrases: t.verifyPhrases,
    cropMethod: "bld_form_panel_bbox",
    matchMethod: "bld_form_panel_bbox_hints",
    reviewVerdict: "geometry_evidence_2026-10-20",
  }));
}

if (tiles.length !== 14) {
  console.error(`Expected 14 building tiles, got ${tiles.length}`);
  process.exit(1);
}

for (const id of UPGRADABLE) {
  for (const level of [2, 3]) {
    const found = tiles.some((t) => t.buildingId === id && t.level === level);
    if (!found) {
      console.error(`Missing tile map for ${id} L${level}`);
      process.exit(1);
    }
  }
}

const map = {
  schema: "ddbg.print-hamlet-building-tile-art-map.v1",
  source: {
    geometry:
      "PUNCHBOARD_300x300 FRONT p1 vector die-cut path bbox (~122×71.6 / ~124×74 / ~139×82 pt, TrimBox origin 21pt, R-048)",
    hintsFixture: "tools/pipeline/print-card-art/fixtures/hamlet-building-tile-bld-p1-hints.json",
    exportScript: "tools/pipeline/scripts/export-print-hamlet-building-tiles.mjs",
    reviewedAt: "2026-10-20",
    notes: [
      exportNote,
      "Guild/Graveyard overprint text redacted per tile when omit-hidden-terms is enabled.",
      "Clip = die-cut bbox inset 0.65pt; Form XObject placement bboxes are not used (they mis-align raster).",
    ],
  },
  tiles,
  pendingConfirmation: [
    "Die-cut geometry is vector path bbox from page.get_drawings(), not PANTONE Rubine hairline parse.",
    "Guild/Graveyard hidden layer omission uses text redaction (not Separation OCG); confirm visually on first Kyries export.",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${tiles.length} building tiles → ${out.replace(repoRoot + "/", "")}`);
