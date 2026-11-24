import type { RawFile } from "../../shared/extract/raw";
import { COVE_CURIO_FRONT, COVE_CURIO_BACK, coveCurioFileSchema } from "../../core/curios/curio";
import type { CurioEffect } from "../../core/curios/curio";

type Row = readonly [
  iconId: string,
  printed: string,
  effect: CurioEffect | null,
  reason: string | null,
];
const pending = "Q-186：Cove Curio 效果图标待核对";
const stress: CurioEffect = { type: "stress", amount: 1 };
const provision: CurioEffect = { type: "rollProvision", count: 1 };
const EFFECT_Y_MIN = 40;

/** 按印刷 FRONT p1–16 登记；仅词典已确认的压力与补给骰效果，其余行停点。 */
const rowsByPage: readonly (readonly Row[])[] = [
  [
    ["12438e9a49", "+1", stress, null],
    ["eebbb64c26", "1 · 3t", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["011ae63e02", "10", null, pending],
  ],
  [
    ["188b149a77", "", null, pending],
    ["d05cfb9165", "1 · 3t", null, pending],
    ["bbe8342098", "5", null, pending],
    ["ae45f5bcb3", "", provision, null],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["bc4c4c71d2", "", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["011ae63e02", "10", null, pending],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["51ee2324e3", "", null, pending],
    ["1951b03736", "", null, pending],
    ["fd239b3b43", "1 · 3t", null, pending],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["d05cfb9165", "1 · 3t", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["4fbd5890e2", "", null, pending],
  ],
  [
    ["188b149a77", "", null, pending],
    ["d05cfb9165", "1 · 3t", null, pending],
    ["011ae63e02", "5", null, pending],
    ["780a0a8ba6", "", null, pending],
  ],
  [
    ["51ee2324e3", "", null, pending],
    ["eebbb64c26", "1 · 3t", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["4fbd5890e2", "", null, pending],
  ],
  [
    ["eebbb64c26", "1 · 3t", null, pending],
    ["1951b03736", "", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["4fbd5890e2", "", null, pending],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["bc4c4c71d2", "", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["011ae63e02", "10", null, pending],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["51ee2324e3", "", null, pending],
    ["1951b03736", "", null, pending],
    ["8585fa8523", "2t", null, pending],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["188b149a77", "1 · 3t", null, pending],
    ["d05cfb9165", "", null, pending],
    ["ae45f5bcb3", "", provision, null],
  ],
  [
    ["51ee2324e3", "", null, pending],
    ["eebbb64c26", "1 · 3t", null, pending],
    ["1951b03736", "", null, pending],
    ["ae45f5bcb3", "", provision, null],
  ],
  [
    ["eebbb64c26", "1 · 3t", null, pending],
    ["011ae63e02", "5", null, pending],
    ["4bfe02849b", "", null, pending],
    ["780a0a8ba6", "", null, pending],
  ],
  [
    ["51ee2324e3", "", null, pending],
    ["eebbb64c26", "1 · 3t", null, pending],
    ["011ae63e02", "10", null, pending],
    ["780a0a8ba6", "", null, pending],
  ],
  [
    ["12438e9a49", "+1", stress, null],
    ["bc4c4c71d2", "", null, pending],
    ["604a7d83ac", "2t", null, pending],
    ["ae45f5bcb3", "", provision, null],
  ],
  [
    ["51ee2324e3", "", null, pending],
    ["eebbb64c26", "1 · 3t", null, pending],
    ["011ae63e02", "5", null, pending],
    ["780a0a8ba6", "", null, pending],
  ],
];
const names = [
  "Barnacle Crusted Chest",
  "Barnacle Crusted Chest",
  "Bas Relief",
  "Bas Relief",
  "Brackish Tide Pool",
  "Brackish Tide Pool",
  "Eerie Coral",
  "Eerie Coral",
  "Fish Idol",
  "Fish Idol",
  "Fish Carcass",
  "Fish Carcass",
  "Giant Oyster",
  "Giant Oyster",
  "Ship’s Figurehead",
  "Ship’s Figurehead",
] as const;

function effectIcons(rawCard: RawFile["cards"][number]) {
  return rawCard.faces.front.icons
    .filter((icon) => !icon.decor && icon.bbox[1] >= EFFECT_Y_MIN)
    .sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
}

function formatPrinted(printed: string, iconId: string): string {
  const token = `{icon:${iconId}}`;
  if (!printed) return token;
  if (printed === "+1") return `${token} +1`;
  if (printed === "1 · 3t") return `1 ${token} 3t`;
  if (printed === "2t") return `${token} 2t`;
  return `${printed} ${token}`.trim();
}

/** R-048：逐卡核对来源与印刷数字；未知效果行保留停点，不扩充全局词典。 */
export function buildCoveCurios(raw: RawFile) {
  if (raw.category !== "curio" || raw.cards.length !== 16 || raw.n_copies_total !== 16)
    throw new Error("需要完整 Cove Curio raw");
  const cards = raw.cards.map((card) => {
    const front = card.faces.front;
    const page = front.page;
    const icons = effectIcons(card);
    const name = names[page - 1]!;
    const titleText = front.lines.map((line) => line.text.replace(/\{icon:[^}]+\}/g, "")).join(" ");
    if (
      front.file !== COVE_CURIO_FRONT ||
      card.faces.back?.file !== COVE_CURIO_BACK ||
      card.faces.back.page !== page ||
      card.source_set !== "extension" ||
      card.copies !== 1 ||
      JSON.stringify(card.pages) !== `[${page}]` ||
      !titleText.includes(name) ||
      !rowsByPage[page - 1]
    )
      throw new Error(`Cove Curio 来源、身份或副本不符：${card.id}`);
    const expected = rowsByPage[page - 1]!;
    if (
      icons.length !== expected.length ||
      icons.some((icon, index) => icon.iconId !== expected[index]![0])
    )
      throw new Error(`Cove Curio 效果图标顺序漂移：${card.id}`);
    return {
      id: card.id,
      name,
      copies: 1 as const,
      text: front.lines
        .filter((line) => line.bbox[1] >= 16 && line.bbox[1] < 42)
        .map((line) => line.text.replace(/\{icon:[^}]+\}/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
      source: { front: front.file, back: card.faces.back!.file, page },
      rows: expected.map(([iconId, printed, effect, reason]) => {
        if (!front.icons.some((icon) => icon.iconId === iconId))
          throw new Error(`Cove Curio 缺少图标：${card.id} / ${iconId}`);
        if (printed === "+1" && !front.spans.some((span) => span.t.trim() === "+1"))
          throw new Error(`Cove Curio 印刷数字漂移：${card.id} / ${iconId}`);
        if (printed === "1 · 3t") {
          const hasOne = front.spans.some((span) => span.t.trim() === "1");
          const hasT = front.spans.some((span) => /3t/.test(span.t));
          if (!hasOne || !hasT) throw new Error(`Cove Curio 印刷数字漂移：${card.id} / ${iconId}`);
        }
        if (
          (printed === "5" || printed === "10") &&
          !front.spans.some((span) => span.t.trim() === printed)
        )
          throw new Error(`Cove Curio 印刷数字漂移：${card.id} / ${iconId}`);
        return {
          iconId,
          printed: formatPrinted(printed, iconId),
          effect,
          reason,
        };
      }),
    };
  });
  return coveCurioFileSchema.parse({ schema: "ddbg-curio-v1", dictionaryVersion: "1.8", cards });
}
