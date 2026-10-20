import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function parseCsv(text) {
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

export function loadExplorationOkRows(repoRoot, csvRel) {
  const csv = resolve(repoRoot, csvRel);
  return parseCsv(readFileSync(csv, "utf8")).filter((r) => r.verdict === "ok");
}

export function backPngRelFromFront(frontPngRel) {
  return frontPngRel
    .replace("_TRINKETS_FRONT.pdf_", "_TRINKETS_BACK.pdf_")
    .replace("_CURIO_FRONT_V2.pdf_", "_CURIO_BACK.pdf_")
    .replace("_quests_FRONT.pdf_", "_quests_BACK.pdf_");
}

export function backPdfFromFront(primaryPdf) {
  return primaryPdf
    .replace("TRINKETS_FRONT", "TRINKETS_BACK")
    .replace("CURIO_FRONT_V2", "CURIO_BACK")
    .replace("quests_FRONT", "quests_BACK");
}
