import type { RawFile } from "./extract/raw";
import { noteIcon, resolveText } from "./icons";
import type { IconLookup } from "./icons";
import type { NormalizedIcon, Segment } from "./schema";

export const DICTIONARY_SOURCE = "dictionary/icon-dictionary-v1.8.json" as const;

export type RawCard = RawFile["cards"][number];

type LabeledNumbers = {
  crit?: number | undefined;
  crit_value?: number | null | undefined;
  acc?: number | undefined;
  acc_value?: number | null | undefined;
  acc_raw?: string | undefined;
};

export type ParsedUnlabeled = {
  text: string;
  left_icon?: string | undefined;
  inside_icon?: string | undefined;
};

export function rawIndex(file: RawFile): Map<string, RawCard> {
  return new Map(file.cards.map((card) => [card.id, card]));
}

export function requireRaw(index: Map<string, RawCard>, id: string): RawCard {
  const card = index.get(id);
  if (!card) throw new Error(`raw 缺少 ${id}`);
  return card;
}

export function faceIcons(
  icons: RawCard["faces"]["front"]["icons"],
  lookup: IconLookup,
  reasons: Set<string>,
): NormalizedIcon[] {
  const resolved: NormalizedIcon[] = [];
  for (const placement of icons) {
    // 提取器标了 decor 的是面板、细条、文字底板，不是待命名的游戏图标。
    if (placement.decor) continue;
    const icon = lookup.resolve(placement.iconId);
    noteIcon(icon, reasons);
    resolved.push(icon);
  }
  return resolved;
}

function integerText(text: string): number | null {
  if (!/^-?\d+$/.test(text)) return null;
  return Number(text);
}

export function printedLabels(
  source: LabeledNumbers,
): { label: "Crit" | "Acc"; raw: string; value: number | null }[] {
  const labels: { label: "Crit" | "Acc"; raw: string; value: number | null }[] = [];
  if (typeof source.crit === "number") {
    labels.push({ label: "Crit", raw: `Crit ${source.crit}`, value: source.crit });
  }
  if (typeof source.acc_raw === "string") {
    labels.push({ label: "Acc", raw: source.acc_raw, value: null });
  } else if (typeof source.acc === "number") {
    labels.push({ label: "Acc", raw: `Acc ${source.acc}`, value: source.acc });
  }
  return labels;
}

/** 标签旁边的数字保持中性字段，不沿用 parsed 的 crit_value / acc_value 名字。 */
function besidePrintedLabels(source: LabeledNumbers) {
  const numbers: {
    text: string;
    numeric: number;
    anchor: { type: "printed_label"; label: "Crit" | "Acc" };
  }[] = [];
  if (typeof source.crit_value === "number") {
    numbers.push({
      text: String(source.crit_value),
      numeric: source.crit_value,
      anchor: { type: "printed_label", label: "Crit" },
    });
  }
  if (typeof source.acc_value === "number") {
    numbers.push({
      text: String(source.acc_value),
      numeric: source.acc_value,
      anchor: { type: "printed_label", label: "Acc" },
    });
  }
  return numbers;
}

export function besideIcons(
  items: readonly ParsedUnlabeled[],
  lookup: IconLookup,
  reasons: Set<string>,
) {
  return items.map((item) => {
    const left = item.left_icon ? lookup.resolve(item.left_icon) : null;
    const inside = item.inside_icon ? lookup.resolve(item.inside_icon) : null;
    if (left) noteIcon(left, reasons);
    if (inside) noteIcon(inside, reasons);
    return {
      text: item.text,
      numeric: integerText(item.text),
      anchor: { type: "beside_icon" as const, left_icon: left, inside_icon: inside },
    };
  });
}

export function unlabeledNumbers(
  source: LabeledNumbers & { unlabeled_numbers: readonly ParsedUnlabeled[] },
  lookup: IconLookup,
  reasons: Set<string>,
) {
  return [
    ...besidePrintedLabels(source),
    ...besideIcons(source.unlabeled_numbers, lookup, reasons),
  ];
}

export function statsLine(
  raw: string | null,
  lookup: IconLookup,
  reasons: Set<string>,
): Segment[] | null {
  if (raw === null) return null;
  return resolveText(raw, lookup, reasons);
}

export function cardStats<T extends { verification: { unverified: boolean } }>(
  cards: readonly T[],
) {
  const unverified = cards.filter((card) => card.verification.unverified).length;
  return { cards: cards.length, verified: cards.length - unverified, unverified };
}

export function assertCardBackOnly(card: RawCard, frontFile: string): string {
  if (card.faces.front.file !== frontFile) {
    throw new Error(`${card.id} 的正面不是 ${frontFile}`);
  }
  const back = card.faces.back;
  if (!back) throw new Error(`${card.id} 缺少背面`);
  if (back.spans.length > 0 || back.icons.length > 0 || back.lines.length > 0) {
    throw new Error(`${card.id} 的背面有数据；BACK 文件应只是卡背`);
  }
  return back.file;
}

export function titleOf(card: RawCard): string {
  const title = card.faces.front.spans[0]?.t;
  if (!title) throw new Error(`${card.id} 没有标题`);
  return title;
}
