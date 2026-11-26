#!/usr/bin/env node
/** Build the hero skill art map from the normalized catalog and reviewed core print crops. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COREBOX_SKILLS_FRONT, pngRelFromPdf } from "./lib/print-png-rel.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function parseArgs(argv) {
  let csv = "tools/pipeline/print-card-art/fixtures/print-hero-skill-review-ok-all.csv";
  let out = "apps/web/src/card-art/hero-skill-print-art-map.json";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--csv" && argv[i + 1]) csv = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
    else throw new Error("未知或缺值的参数：" + argv[i]);
  }
  return { csv: resolve(root, csv), out: resolve(root, out) };
}

function reviewedCorePages(csv) {
  const [header, ...lines] = readFileSync(csv, "utf8").trim().split(/\r?\n/);
  const headings = header.split(",");
  const pages = new Map();
  for (const line of lines) {
    const fields = line.split(",");
    const row = Object.fromEntries(headings.map((name, i) => [name, fields[i]]));
    if (row.verdict !== "ok") continue;
    const page = Number(row.printPage);
    if (!Number.isInteger(page) || page < 1 || pages.has(page))
      throw new Error("审核表的印刷页缺失或重复：" + row.printPage);
    pages.set(page, row);
  }
  return pages;
}

const { csv, out } = parseArgs(process.argv.slice(2));
const { cards: catalog } = JSON.parse(
  readFileSync(resolve(root, "packages/data/normalized/corebox/hero_skill.json"), "utf8"),
);
const review = reviewedCorePages(csv);
const corePdf = basename(COREBOX_SKILLS_FRONT, ".pdf");
const seenIds = new Set();
const cards = catalog.map((card) => {
  const { id, source, name, level, verification } = card;
  if (
    !/^hero_skill:(?:core|cove|warrens|weald|musketeer):h\d{2}:p\d{3}$/.test(id) ||
    seenIds.has(id)
  )
    throw new Error("英雄技能 ID 无效或重复：" + id);
  seenIds.add(id);
  const hero = card.hero ?? "ABOMINATION";
  const primaryPdf = basename(source.file, ".pdf");
  const isCore = primaryPdf === corePdf;
  const row = isCore ? review.get(source.page) : undefined;
  if (isCore) {
    if (
      !row ||
      row.hero !== (card.hero ?? "") ||
      Number(row.level) !== level ||
      row.pdfBase !== primaryPdf
    )
      throw new Error("核心印刷审核与正式卡不一致：" + id);
    review.delete(source.page);
  }
  return {
    id,
    name,
    level,
    hero,
    dataStatus: verification.unverified ? "art-only" : "verified-data",
    pngRel: row?.pngRel ?? pngRelFromPdf(source.file, source.page),
    printPage: source.page,
    primaryPdf,
    matchMethod: row?.matchMethod ?? "normalized_source",
    reviewVerdict: row?.verdict ?? "source-matched",
  };
});
if (review.size) throw new Error("核心印刷审核存在未匹配页");

const map = {
  schema: "ddbg.print-hero-skill-art-map.v1",
  source: {
    buildScript: "tools/pipeline/scripts/build-print-hero-skill-art-map.mjs",
    coreRowCount: cards.filter((card) => card.reviewVerdict === "ok").length,
    rowCount: cards.length,
    notes: [
      "Card IDs, names, levels and print sources come from the normalized hero skill catalog.",
      "Core crop paths come from the approved CSV. Expansion crops follow the recorded print source.",
    ],
  },
  cards,
  uncoveredEngineIds: [],
  pendingConfirmation: [
    "Expansion crop alignment is based on the normalized PDF and page; the approved CSV covers core crops only.",
  ],
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
