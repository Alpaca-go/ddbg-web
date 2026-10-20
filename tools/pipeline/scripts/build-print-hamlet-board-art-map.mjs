#!/usr/bin/env node
/**
 * Promote hamlet-board-export.json → apps/web hamlet-board-print-art-map.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const TRIM = {
  widthPt: 841.89,
  heightPt: 476.22,
  x0Pt: 56.69,
  y0Pt: 56.69,
  x1Pt: 898.58,
  y1Pt: 532.91,
};

function parseArgs(argv) {
  let exportPath = resolve(repoRoot, ".cache/print-card-art/hamlet-board-export.json");
  let out = resolve(repoRoot, "apps/web/src/card-art/hamlet-board-print-art-map.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--export" && argv[i + 1]) exportPath = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(repoRoot, argv[++i]);
  }
  return { exportPath, out };
}

const { exportPath, out } = parseArgs(process.argv);

let board;
let exportNote = "pngRel from export_hamlet_board.py; run export then build.";
if (existsSync(exportPath)) {
  const data = JSON.parse(readFileSync(exportPath, "utf8"));
  board = data.board;
  exportNote = `Merged from ${exportPath.replace(repoRoot + "/", "")}`;
} else {
  board = {
    png_rel: "png/hamlet-board-front.png",
    pdf_rel: "DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf",
    page: 1,
    crop_method: "trimbox",
    trim_width_pt: TRIM.widthPt,
    trim_height_pt: TRIM.heightPt,
    trim_x0_pt: TRIM.x0Pt,
    trim_y0_pt: TRIM.y0Pt,
    text_snippet: "",
  };
}

const map = {
  schema: "ddbg.print-hamlet-board-art-map.v1",
  source: {
    geometry: "Full-sheet TrimBox (56.69,56.69)–(898.58,532.91) = 841.89×476.22pt (HB, R-048)",
    trimBoxPt: TRIM,
    exportScript: "tools/pipeline/scripts/export-print-hamlet-board.mjs",
    reviewedAt: "2026-10-20",
    notes: [exportNote, "Hamlet BACK uses different bleed; not exported in this slice."],
  },
  board: {
    id: "hamlet_board:p001",
    face: "front",
    pngRel: board.png_rel,
    primaryPdf: board.pdf_rel?.split("/").pop() ?? "DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf",
    printPage: board.page ?? 1,
    cropMethod: board.crop_method ?? "trimbox",
    textSnippet: board.text_snippet ?? "",
    matchMethod: "trimbox",
    reviewVerdict: "geometry_evidence_2026-10-20",
  },
  pendingConfirmation: [],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote hamlet board map → ${out.replace(repoRoot + "/", "")}`);
