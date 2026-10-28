#!/usr/bin/env node
/**
 * Promote extract player_aid → apps/web player-aid-print-art-map.json.
 * Page order + TrimBox 70×120mm (198.43×340.16pt) from raw extract; R-048.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const rawPath = resolve(repoRoot, "packages/data/extract/corebox/raw/player_aid.json");
const out = resolve(repoRoot, "apps/web/src/card-art/player-aid-print-art-map.json");

const TRIM = {
  widthPt: 198.43,
  heightPt: 340.16,
  x0Pt: 21,
  y0Pt: 21,
  x1Pt: 219.43,
  y1Pt: 361.16,
};

const PRINT_PREFIX =
  "DARKEST_DUNGEON_PRINT_EN_WAVE_1_MG_DD_01_EN_COREBOX_Print_02_DD_CARDS_COREBOX_";

function pngRel(pdfBase, page) {
  const pageStr = String(page).padStart(3, "0");
  return `png/${PRINT_PREFIX}${pdfBase}.pdf_p${pageStr}.png`;
}

function backPdfFromFront(primaryPdf) {
  return primaryPdf.replace("_FRONT.pdf", "_BACK.pdf");
}

function backPngRelFromFront(frontPngRel) {
  return frontPngRel.replace("_FRONT.pdf_", "_BACK.pdf_");
}

const raw = JSON.parse(readFileSync(rawPath, "utf8"));
const byId = new Map(raw.cards.map((c) => [c.id, c]));

/** 规格书 §18：p001 = AID-Prov / AID-Expl；p005 = AID-Rooms / AID-Cond（R-049）。 */
const ENABLED = [
  { id: "player_aid:p001", design: "provisions", reviewVerdict: "extract_trim_and_spec_aid_prov" },
  { id: "player_aid:p005", design: "rooms", reviewVerdict: "extract_trim_and_spec_aid_rooms" },
];

const cards = ENABLED.map(({ id, design, reviewVerdict }) => {
  const card = byId.get(id);
  if (!card) {
    console.error(`Missing raw player aid ${id}`);
    process.exit(1);
  }
  const frontPage = card.faces.front.page;
  const frontPdf = card.faces.front.file.split("/").pop();
  const title =
    card.faces.front.spans?.find((s) => s.t && s.font === "DwarvenAxeBB")?.t ?? id;
  return {
    id,
    name: title,
    design,
    status: "enabled",
    faces: {
      front: {
        pngRel: pngRel(frontPdf.replace(".pdf", ""), frontPage),
        printPage: frontPage,
        primaryPdf: frontPdf,
        cropMethod: "trimbox",
        textSnippet: title,
      },
      back: {
        pngRel: backPngRelFromFront(pngRel(frontPdf.replace(".pdf", ""), card.faces.back.page)),
        printPage: card.faces.back.page,
        primaryPdf: backPdfFromFront(frontPdf),
        cropMethod: "trimbox",
        textSnippet:
          card.faces.back.spans?.find((s) => s.t && s.font === "DwarvenAxeBB")?.t ?? "",
      },
    },
    matchMethod: "page_order_and_raw_id",
    reviewVerdict,
    copiesOnPrint: card.copies,
  };
});

const map = {
  schema: "ddbg.print-player-aid-art-map.v1",
  source: {
    raw: "packages/data/extract/corebox/raw/player_aid.json",
    geometry: "TrimBox 70×120mm = 198.43×340.16pt (same deck as 70×120 quest cards, R-048)",
    trimBoxPt: TRIM,
    exportScript: "tools/pipeline/scripts/export-print-card-art.mjs",
    rulesRef:
      "docs/spec/core-rules-spec-v0.2.md §18.1–18.4 AID-Prov/Expl/Rooms/Cond; R-049",
    reviewedAt: "2026-10-28",
    notes: [
      "player_aid:p001 FRONT p1 = Provisions；BACK p1 = Exploration（各 4 副本同面）。",
      "player_aid:p005 FRONT p5 = Rooms；BACK p5 = Conditions（各 4 副本同面）。",
      "pngRel paths relative to .cache/print-card-art after export-print-card-art.mjs.",
      "D6 Provision dice_net：引擎六面已接；展开图面→图标 raster 未批，见 pendingConfirmation。",
    ],
  },
  cards,
  pendingConfirmation: [
    "DD_COREBOX_DICE_D6_Provision.pdf dice_net：不接逐面 PNG map（展开图面序与桌面骰模几何待 Kyries 确认，R-048）。",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} player aid card(s) → ${out.replace(repoRoot + "/", "")}`);
