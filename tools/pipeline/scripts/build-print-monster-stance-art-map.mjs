#!/usr/bin/env node
/**
 * Promote print-card-art manifest rows for Monster Stance boards → apps/web card-art JSON.
 *
 * Usage (repo root):
 *   node tools/pipeline/scripts/build-print-monster-stance-art-map.mjs \
 *     --manifest tools/pipeline/print-card-art/fixtures/print-monster-stance-manifest.csv
 *
 * Production manifest (after export-print-card-art.mjs):
 *   node tools/pipeline/scripts/build-print-monster-stance-art-map.mjs \
 *     --manifest .cache/print-card-art/manifest.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const STANCE_SLOTS = [
  { stance: "aggressive", rank: 1, labelZh: "进攻" },
  { stance: "defensive", rank: 2, labelZh: "防御" },
  { stance: "ranged", rank: 3, labelZh: "远程" },
  { stance: "support", rank: 4, labelZh: "支援" },
];

function parseArgs(argv) {
  let manifest = resolve(
    repoRoot,
    "tools/pipeline/print-card-art/fixtures/print-monster-stance-manifest.csv",
  );
  let out = resolve(repoRoot, "apps/web/src/card-art/monster-stance-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--manifest" && argv[i + 1]) manifest = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { manifest, out };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    header.forEach((h, j) => {
      row[h] = cols[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function isMonsterStanceRow(row) {
  const pdf = row.pdf_rel || "";
  return (
    pdf.includes("Monster_Stance") &&
    row.crop_method === "trimbox" &&
    row.png_rel &&
    Number(row.page) >= 1
  );
}

function boardIdFromRow(row) {
  if (row.engine_id?.startsWith("monster_stance:")) {
    return row.engine_id.replace("monster_stance:", "");
  }
  if (row.side === "front" || row.side === "back") return row.side;
  if (pdfIncludes(row.pdf_rel, "FRONT")) return "front";
  if (pdfIncludes(row.pdf_rel, "BACK")) return "back";
  return null;
}

function pdfIncludes(pdfRel, token) {
  return (pdfRel || "").includes(token);
}

function primaryPdfBasename(pdfRel) {
  const base = (pdfRel || "").split("/").pop() || pdfRel;
  return base.replace(/\.pdf$/i, "");
}

const { manifest, out } = parseArgs(process.argv);
const allRows = parseCsv(readFileSync(manifest, "utf8"));
const stanceRows = allRows.filter(isMonsterStanceRow);

if (stanceRows.length < 2) {
  console.error(
    `Expected at least FRONT+BACK Monster_Stance trimbox rows in manifest, got ${stanceRows.length}`,
  );
  process.exit(1);
}

const boards = [];
const pending = [];
for (const row of stanceRows) {
  const id = boardIdFromRow(row);
  if (!id) {
    pending.push(`unmapped board row: ${row.pdf_rel}`);
    continue;
  }
  boards.push({
    id,
    side: id,
    category: row.category || "stance_board",
    pngRel: row.png_rel,
    printPage: Number(row.page),
    primaryPdf: primaryPdfBasename(row.pdf_rel),
    cropMethod: row.crop_method,
    matchStatus: row.match_status || "skipped",
    pdfRel: row.pdf_rel,
  });
}

const byId = new Map(boards.map((b) => [b.id, b]));
if (!byId.has("front") || !byId.has("back")) {
  console.error("Manifest must include monster_stance front and back boards");
  process.exit(1);
}

const map = {
  schema: "ddbg.print-monster-stance-art-map.v1",
  source: {
    manifest: manifest.replace(repoRoot + "/", "").replace(/\\/g, "/"),
    rowFilter: "Monster_Stance + trimbox",
    reviewedAt: "2026-10-19",
    notes: [
      "Kyries 2026-10-19: whole-board display only (no per-stance strip crops).",
      "pngRel paths are relative to .cache/print-card-art/ after export-print-card-art.mjs.",
      "UI uses TrimBox PNG as a single raster; stance highlights are CSS overlays only.",
      "R-048: map stores no invented crop rectangles or icon geometry from the board.",
    ],
  },
  boards: boards.sort((a, b) => a.id.localeCompare(b.id)),
  stanceSlots: STANCE_SLOTS,
  pendingConfirmation: [
    ...pending,
    "Hero stance track uses the same Monster Stance board art in UI; printed Hero Dashboard not wired.",
    "Large monster 2-slot span: no print strip; show width on entity chip only.",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${boards.length} boards → ${out.replace(repoRoot + "/", "")}`);
