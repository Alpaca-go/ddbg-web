#!/usr/bin/env node
/**
 * Promote warrens-punchboard-export.json → apps/web card-art JSON.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const HEROES = ["LEPER", "ANTIQUARIAN"];

/** Evidence from DD_EN_WARRENS_PUNCHBOARD (MG_DD_04); geometryVerified=false in data layer. */
const CONVENTION = [
  {
    hero: "LEPER",
    face: "front",
    pngRel: "png/warrens-leper-front.png",
    diecutPt: [38.94, 36.65, 217.65, 274.64],
  },
  {
    hero: "ANTIQUARIAN",
    face: "front",
    pngRel: "png/warrens-antiquarian-front.png",
    diecutPt: [235.37, 36.65, 414.08, 274.64],
  },
  {
    hero: "LEPER",
    face: "back",
    pngRel: "png/warrens-leper-back.png",
    diecutPt: [235.37, 36.65, 414.08, 274.64],
  },
  {
    hero: "ANTIQUARIAN",
    face: "back",
    pngRel: "png/warrens-antiquarian-back.png",
    diecutPt: [38.94, 36.65, 217.65, 274.64],
  },
];

function parseArgs(argv) {
  let exportPath = resolve(repoRoot, ".cache/print-card-art/warrens-punchboard-export.json");
  let out = resolve(repoRoot, "apps/web/src/card-art/warrens-punchboard-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--export" && argv[i + 1]) exportPath = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { exportPath, out };
}

function buildFromConvention() {
  return CONVENTION.map((row) => ({
    hero: row.hero,
    face: row.face,
    pngRel: row.pngRel,
    primaryPdf:
      row.face === "front"
        ? "DD_EN_WARRENS_PUNCHBOARD_FRONT.pdf"
        : "DD_EN_WARRENS_PUNCHBOARD_BACK.pdf",
    printPage: 1,
    diecutPt: row.diecutPt,
    diecutWhPt: [178.71, 237.99],
    cropMethod: "rubine_diecut_bbox_inset",
    matchMethod: "rubine_diecut_bbox+hero_text",
    reviewVerdict: "geometry_unverified_2026-11-28",
  }));
}

const { exportPath, out } = parseArgs(process.argv);
let standees;
let exportNote =
  "pngRel slugs from export_warrens_punchboard_standees.py; run export then build on a machine with EN_FILES PDFs.";

if (existsSync(exportPath)) {
  const data = JSON.parse(readFileSync(exportPath, "utf8"));
  standees = (data.standees || []).map((s) => ({
    hero: s.hero,
    face: s.face,
    pngRel: s.png_rel,
    primaryPdf: s.pdf_rel?.split("/").pop() ?? "",
    printPage: s.page,
    diecutPt: s.diecut_pt,
    diecutWhPt: s.diecut_wh_pt,
    cropMethod: s.crop_method,
    matchMethod: "exported",
    reviewVerdict: "exported",
  }));
  exportNote = `Merged from ${exportPath.replace(repoRoot + "/", "")}`;
} else {
  standees = buildFromConvention();
}

if (standees.length !== 4) {
  console.error(`Expected 4 Warrens standee rows, got ${standees.length}`);
  process.exit(1);
}

const heroes = new Set(standees.filter((s) => s.face === "front").map((s) => s.hero));
for (const h of HEROES) {
  if (!heroes.has(h)) {
    console.error(`Missing FRONT hero in map: ${h}`);
    process.exit(1);
  }
}

const map = {
  schema: "ddbg.print-warrens-punchboard-art-map.v1",
  source: {
    geometry:
      "PANTONE Rubine Red C Separation die-cut bbox ~178.71×237.99pt; MG_DD_04_EN_WARRENS punchboard (R-048)",
    exportScript: "tools/pipeline/print-card-art/export_warrens_punchboard_standees.py",
    geometryVerified: false,
    notes: [
      exportNote,
      "Extension heroes LEPER / ANTIQUARIAN; not merged into formal-eight DH standee map.",
      "Production raster omits Separation plate when export uses separation_omit patch.",
    ],
    reviewedAt: "2026-11-28",
  },
  standees: standees.sort((a, b) => a.hero.localeCompare(b.hero) || a.face.localeCompare(b.face)),
  pendingConfirmation: [
    "Q-WARRENS-22：Rubine bbox 量测待印核；不得用于已核准部署坐标。",
    "Q-WARRENS-23：FRONT/BACK 左右对调与物理正反面是否同稿待目视确认。",
    "Q-WARRENS-24：与 TDH / 核心冲压板立牌是否共用同稿待确认。",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${standees.length} standees → ${out.replace(repoRoot + "/", "")}`);
