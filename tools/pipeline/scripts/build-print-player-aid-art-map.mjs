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

/** Kyries 规格书 AID-Prov：FRONT p1–4 同文；引擎 id player_aid:p001。 */
const ENABLED = ["player_aid:p001"];

const cards = ENABLED.map((id) => {
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
    design: id === "player_aid:p001" ? "provisions" : "rooms",
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
    reviewVerdict: "extract_trim_and_spec_aid_prov",
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
    rulesRef: "docs/spec/core-rules-spec-v0.2.md §18.1 AID-Prov / R12",
    reviewedAt: "2026-10-28",
    notes: [
      "player_aid:p001 FRONT = Provisions（4 印刷副本同面）；本 map 只绑 p1 页序 PNG。",
      "pngRel paths relative to .cache/print-card-art after export-print-card-art.mjs.",
      "D6 Provision dice_net：引擎六面已接；展开图面→图标 raster 未批，见 pendingConfirmation。",
    ],
  },
  cards,
  pendingConfirmation: [
    "player_aid:p005（Rooms / AID-Rooms FRONT p5–8）：印刷页序可导出，桌面 reference UI 未接（本 PR 仅 Provisions）。",
    "player_aid:p001 BACK（Exploration / AID-Expl）：同卡背面，非补给辅助面；探索 reference 另刀。",
    "player_aid:p005 BACK（Conditions / AID-Cond）：状态参考卡，未接。",
    "DD_COREBOX_DICE_D6_Provision.pdf dice_net：不接逐面 PNG map（展开图面序与桌面骰模几何待 Kyries 确认，R-048）。",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} player aid card(s) → ${out.replace(repoRoot + "/", "")}`);
