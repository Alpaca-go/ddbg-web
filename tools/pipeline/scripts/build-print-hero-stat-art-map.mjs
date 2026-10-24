#!/usr/bin/env node
/**
 * Build hero-stat-print-art-map.json (corebox raw ids + extension art-only ids).
 *
 * Usage:
 *   node tools/pipeline/scripts/build-print-hero-stat-art-map.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXTENSION_STAT_PACKS,
  PRINT_18_HERO_NAMES,
  packStatPdfRel,
} from "../print-card-art/fixtures/print-hero-18-art-catalog.mjs";
import { COREBOX_STAT_BACK, COREBOX_STAT_FRONT, pngRelFromPdf } from "./lib/print-png-rel.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function heroNameFromRawCard(card) {
  const spans = [...(card.faces?.front?.spans ?? []), ...(card.faces?.back?.spans ?? [])];
  return spans.find((s) => /^[A-Z][A-Z -]+$/.test(s.t) && s.t.length > 4)?.t ?? "";
}

function loadVerifiedIds() {
  const path = resolve(repoRoot, "packages/data/normalized/corebox/hero_stat.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  return new Set(data.cards.map((c) => c.id));
}

function coreFaces() {
  const raw = JSON.parse(
    readFileSync(resolve(repoRoot, "packages/data/extract/corebox/raw/hero_stat.json"), "utf8"),
  );
  const verified = loadVerifiedIds();
  const faces = [];
  for (const card of raw.cards) {
    const hero = heroNameFromRawCard(card);
    const rawId = card.id;
    const page = card.faces?.front?.page ?? card.pages?.[0];
    for (const face of ["front", "back"]) {
      const id = `${rawId}:${face}`;
      const pdf = face === "front" ? COREBOX_STAT_FRONT : COREBOX_STAT_BACK;
      const dataStatus = verified.has(id) ? "verified-data" : "art-only";
      faces.push({
        id,
        rawId,
        face,
        hero,
        level: null,
        dataStatus,
        pngRel: pngRelFromPdf(pdf, page),
        printPage: page,
        primaryPdf: pdf.split("/").pop()?.replace(".pdf", "") ?? "",
        matchMethod: "corebox_page_order+hero_name",
        reviewVerdict: dataStatus === "verified-data" ? "normalized" : "art-only",
      });
    }
  }
  return faces;
}

function extensionFaces() {
  const faces = [];
  for (const pack of EXTENSION_STAT_PACKS) {
    const frontPdf = packStatPdfRel(pack, "front");
    const backPdf = packStatPdfRel(pack, "back");
    for (const { hero, statPages } of pack.heroes) {
      const [pI, pIII] = statPages;
      const entries = [
        { rawKey: "p001", page: pI, levels: { front: 1, back: 2 } },
        { rawKey: "p002", page: pIII, levels: { front: 3 } },
      ];
      for (const row of entries) {
        for (const face of Object.keys(row.levels)) {
          const id = `hero_stat:${pack.pack}:${hero.toLowerCase().replace(/\s+/g, "-")}:${row.rawKey}:${face}`;
          const pdf = face === "front" ? frontPdf : backPdf;
          faces.push({
            id,
            rawId: `hero_stat:${pack.pack}:${row.rawKey}`,
            face,
            hero,
            level: row.levels[face],
            dataStatus: "art-only",
            pngRel: pngRelFromPdf(pdf, row.page),
            printPage: row.page,
            primaryPdf: pdf.split("/").pop()?.replace(".pdf", "") ?? "",
            matchMethod: "extension_page_order_pending",
            reviewVerdict: "art-only",
          });
        }
      }
    }
  }
  return faces;
}

const faces = [...coreFaces(), ...extensionFaces()];
const heroesMapped = new Set(faces.map((f) => f.hero));
const missingHeroes = PRINT_18_HERO_NAMES.filter((h) => !heroesMapped.has(h));

const out = resolve(repoRoot, "apps/web/src/card-art/hero-stat-print-art-map.json");
const map = {
  schema: "ddbg.print-hero-stat-art-map.v1",
  source: {
    buildScript: "tools/pipeline/scripts/build-print-hero-stat-art-map.mjs",
    catalog: "tools/pipeline/print-card-art/fixtures/print-hero-18-art-catalog.mjs",
    notes: [
      "Core faces use extract/corebox raw hero_stat page order (MG_DD_01 Hero_STAT).",
      "dataStatus verified-data = normalized hero_stat.json id present; art-only = print raster only (R-048).",
      "Extension pack folders/MG_DD ids must match local EN_FILES; re-run export-print-card-art.mjs after path fixes.",
      "pngRel paths relative to .cache/print-card-art/ (TrimBox full page, R-048).",
    ],
    reviewedAt: "2026-10-24",
  },
  faces,
  pendingConfirmation: [
    "Extension STAT page order per pack (Warrens/Cove/Weald/Musketeer) not Kyries-reviewed in this PR.",
    "MG_DD_05/06/07/10 folder names inferred from EN_FILES layout — confirm on first export.",
    "Core Jester/Arbalest/Abomination STAT faces are art-only until attributesVerified gameplay data lands.",
    ...(missingHeroes.length
      ? [`Catalog heroes missing from map faces: ${missingHeroes.join(", ")}`]
      : []),
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(
  `Wrote ${faces.length} hero stat faces (${faces.filter((f) => f.dataStatus === "verified-data").length} verified-data, ${faces.filter((f) => f.dataStatus === "art-only").length} art-only) → ${out.replace(repoRoot + "/", "")}`,
);
