#!/usr/bin/env node
/** Build the hero STAT art map from approved cards and the ancillary core print faces. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COREBOX_STAT_BACK, COREBOX_STAT_FRONT, pngRelFromPdf } from "./lib/print-png-rel.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const { cards } = read("packages/data/normalized/corebox/hero_stat.json");
const { cards: rawCards } = read("packages/data/extract/corebox/raw/hero_stat.json");

function printFace(pdf, printPage) {
  return { pngRel: pngRelFromPdf(pdf, printPage), printPage, primaryPdf: basename(pdf, ".pdf") };
}

const corePdfForFace = { front: COREBOX_STAT_FRONT, back: COREBOX_STAT_BACK };
const approvedFaces = new Set();
const approvedIds = new Set();
const faces = cards.map((card) => {
  const { id, rawId, face, name, level, source } = card;
  if (
    !/^hero_stat:(?:core|cove|warrens|weald|musketeer):h\d{2}:p\d{3}:(?:front|back)$/.test(id) ||
    approvedIds.has(id)
  )
    throw new Error("英雄 STAT ID 无效或重复：" + id);
  approvedIds.add(id);
  approvedFaces.add(rawId + ":" + face);
  const corePdf = corePdfForFace[face];
  const pdf = source.file.startsWith("02_DD_CARDS_COREBOX/") ? corePdf : source.file;
  return {
    id,
    rawId,
    face,
    hero: name,
    level,
    dataStatus: "verified-data",
    ...printFace(pdf, source.page),
    matchMethod: "normalized_source",
    reviewVerdict: "normalized",
  };
});

for (const card of rawCards) {
  for (const [face, pdf] of Object.entries(corePdfForFace)) {
    if (approvedFaces.has(card.id + ":" + face)) continue;
    const page = card.faces.front.page;
    const hero =
      card.faces.front.spans.find((span) => /^[A-Z][A-Z -]+$/.test(span.t) && span.t.length > 4)
        ?.t ?? "";
    faces.push({
      id: null,
      rawId: card.id,
      face,
      hero,
      level: null,
      dataStatus: "art-only",
      ...printFace(pdf, page),
      matchMethod: "corebox_page_order+hero_name",
      reviewVerdict: "art-only",
    });
  }
}

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--out" || !args[1]))
  throw new Error("用法：build-print-hero-stat-art-map.mjs [--out PATH]");
const out = resolve(root, args[1] ?? "apps/web/src/card-art/hero-stat-print-art-map.json");
const map = {
  schema: "ddbg.print-hero-stat-art-map.v1",
  source: {
    buildScript: "tools/pipeline/scripts/build-print-hero-stat-art-map.mjs",
    notes: [
      "Approved gameplay faces use canonical IDs and the normalized print source.",
      "Ancillary core faces have no gameplay ID. Their rawId and face locate the original print.",
    ],
  },
  faces,
  pendingConfirmation: [],
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
