#!/usr/bin/env node
/**
 * Promote hero-standee-export.json → apps/web card-art JSON.
 *
 * Usage:
 *   node tools/pipeline/scripts/build-print-hero-standee-art-map.mjs
 *   node tools/pipeline/scripts/build-print-hero-standee-art-map.mjs \
 *     --export .cache/print-card-art/hero-standee-export.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const FORMAL_HEROES = [
  "CRUSADER",
  "HELLION",
  "BOUNTY HUNTER",
  "HIGHWAYMAN",
  "GRAVE ROBBER",
  "VESTAL",
  "OCCULTIST",
  "PLAGUE DOCTOR",
];

/** Evidence-backed FRONT rows when export JSON is absent (cloud CI). */
const CONVENTION_FRONT = [
  { hero: "CRUSADER", page: 1, diecutPt: [44.08, 39.53, 221.91, 276.62] },
  { hero: "HELLION", page: 1, diecutPt: [243.45, 39.53, 421.28, 276.62] },
  { hero: "BOUNTY HUNTER", page: 1, diecutPt: [442.82, 39.53, 620.65, 276.62] },
  { hero: "HIGHWAYMAN", page: 1, diecutPt: [44.08, 299.37, 221.91, 536.46] },
  { hero: "GRAVE ROBBER", page: 1, diecutPt: [243.45, 299.37, 421.28, 536.46] },
  { hero: "VESTAL", page: 1, diecutPt: [44.08, 559.22, 221.91, 796.3] },
  { hero: "OCCULTIST", page: 2, diecutPt: [44.08, 39.53, 221.91, 276.62] },
  { hero: "PLAGUE DOCTOR", page: 2, diecutPt: [243.45, 39.53, 421.28, 276.62] },
];

function parseArgs(argv) {
  let exportPath = resolve(repoRoot, ".cache/print-card-art/hero-standee-export.json");
  let out = resolve(repoRoot, "apps/web/src/card-art/hero-standee-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--export" && argv[i + 1]) exportPath = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { exportPath, out };
}

function slug(hero) {
  return hero.toLowerCase().replace(/\s+/g, "-");
}

function buildFromConvention() {
  return CONVENTION_FRONT.map((row) => ({
    hero: row.hero,
    face: "front",
    pngRel: `png/${slug(row.hero)}-front.png`,
    primaryPdf: "DD_EN_THE_DARKEST_HEROES_PUNCHBOARD_FRONT.pdf",
    printPage: row.page,
    diecutPt: row.diecutPt,
    diecutWhPt: [177.83, 237.09],
    cropMethod: "rubine_diecut_bbox_inset",
    matchMethod: "rubine_diecut_bbox+hero_text",
    reviewVerdict: "geometry_evidence_2026-10-20",
  }));
}

const { exportPath, out } = parseArgs(process.argv);
let standees;
let exportNote =
  "pngRel slugs from export_hero_standees.py; run export then build on a machine with EN_FILES PDFs.";

if (existsSync(exportPath)) {
  const data = JSON.parse(readFileSync(exportPath, "utf8"));
  standees = (data.standees || [])
    .filter((s) => s.face === "front")
    .map((s) => ({
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

if (standees.length !== 8) {
  console.error(`Expected 8 formal FRONT standees, got ${standees.length}`);
  process.exit(1);
}

const heroes = new Set(standees.map((s) => s.hero));
for (const h of FORMAL_HEROES) {
  if (!heroes.has(h)) {
    console.error(`Missing hero in map: ${h}`);
    process.exit(1);
  }
}

const map = {
  schema: "ddbg.print-hero-standee-art-map.v1",
  source: {
    geometry:
      "PANTONE Rubine Red C Separation die-cut path bbox 177.83×237.09pt; DD_EN_THE_DARKEST_HEROES_PUNCHBOARD (R-048)",
    exportScript: "tools/pipeline/print-card-art/export_hero_standees.py",
    notes: [
      exportNote,
      "Gothic arch panel — not circular TTS Custom_Token; UI uses full bbox clip (no circular mask).",
      "Production raster omits Separation plate via content-stream SCN patch when exporting.",
      "CORE PUNCHBOARD_300x300 p3 is reference only; Hellion Rubine path unstable — DH is canonical.",
    ],
    reviewedAt: "2026-10-20",
  },
  standees: standees.sort((a, b) => a.hero.localeCompare(b.hero)),
  pendingConfirmation: [
    "DH punchboard UNLABELED die-cut slots (Jester / Abomination / Arbalest?) not mapped in formal8 slice.",
    "FRONT vs BACK raster bytes differ for Crusader trial — duplex same art vs mirrored face 待目视确认.",
    "Bleed vs inset clip at arch points vs physical die-cut 待确认.",
    "TTS Custom_Token may be circular crop of same portrait art 待确认.",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${standees.length} standees → ${out.replace(repoRoot + "/", "")}`);
