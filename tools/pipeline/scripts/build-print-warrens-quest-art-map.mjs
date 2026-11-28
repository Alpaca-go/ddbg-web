#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const questCards = JSON.parse(
  readFileSync(
    resolve(repoRoot, "packages/data/normalized/extension/warrens/quest_cards.json"),
    "utf8",
  ),
);
const higher = JSON.parse(
  readFileSync(
    resolve(repoRoot, "packages/data/normalized/extension/warrens/higher_quests.json"),
    "utf8",
  ),
);
const all = [...questCards.cards, ...higher.cards].sort((a, b) => a.source.page - b.source.page);
const PDF_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_70_120_quests_FRONT.pdf";
const PDF_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_70_120_quests_BACK.pdf";
const TRIM = { widthPt: 198.43, heightPt: 340.16 };

const cards = all.map((card) => ({
  id: card.id,
  name: card.name,
  status: "art-only",
  faces: {
    front: {
      pngRel: `png/extension/warrens/quests/front-p${String(card.source.page).padStart(3, "0")}.png`,
      printPage: card.source.page,
      primaryPdf: PDF_FRONT,
      cropMethod: "trimbox",
      textSnippet: card.name,
    },
    back: {
      pngRel: `png/extension/warrens/quests/back-p${String(card.source.page).padStart(3, "0")}.png`,
      printPage: card.source.page,
      primaryPdf: PDF_BACK,
      cropMethod: "trimbox",
      textSnippet: card.name,
    },
  },
  matchMethod: "print_page",
  reviewVerdict: "MG_DD_04_EN_WARRENS quest PDF",
}));

const out = resolve(repoRoot, "apps/web/src/card-art/warrens-quest-print-art-map.json");
const map = {
  schema: "ddbg.print-warrens-quest-art-map.v1",
  source: {
    pack: "warrens",
    geometry: "TrimBox 198.43×340.16pt（与核心任务卡一致，R-048）",
    trimBoxPt: TRIM,
    exportScript: "tools/pipeline/extract-print/scripts/extract_warrens_quest.py",
    enabledQuestIds: [],
    artOnlyQuestIds: cards.map((c) => c.id),
    reviewedAt: "2026-11-28",
    notes: [
      "15 页 FRONT/BACK 全映射；status art-only = 数据已登记，出征 UI 未启用（Q-WARRENS-00）。",
    ],
  },
  cards,
  pendingConfirmation: ["Q-WARRENS-00", "Q-WARRENS-01", "Q-WARRENS-02"],
};

writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${cards.length} Warrens quest art cards → ${out.replace(repoRoot + "/", "")}`);
