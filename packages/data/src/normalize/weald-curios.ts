import type { RawFile } from "../extract/raw";
import { WEALD_CURIO_FRONT, WEALD_CURIO_BACK, wealdCurioFileSchema } from "../curio";
import type { CurioEffect } from "../curio";

type Row = readonly [iconId: string, printed: string, effect: CurioEffect];
const stress: Row = ["12438e9a49", "+1", { type: "stress", amount: 1 }];
const negative = (id = "f8686db45a"): Row => [
  id,
  "",
  { type: "drawQuirk", polarity: "negative", count: 1 },
];
const positive = (id = "ca20d29507"): Row => [
  id,
  "",
  { type: "drawQuirk", polarity: "positive", count: 1 },
];
const blight: Row = [
  "a637867634",
  "1 · 3t",
  { type: "status", kind: "blight", amount: 1, duration: 3 },
];
const bleed: Row = [
  "aea2713cb8",
  "1 · 3t",
  { type: "status", kind: "bleed", amount: 1, duration: 3 },
];
const disease: Row = ["6a83eb27d3", "", { type: "drawDisease", count: 1 }];
const trinket: Row = ["85e094f269", "", { type: "drawTrinket", count: 1 }];
const provision: Row = ["ae45f5bcb3", "", { type: "rollProvision", count: 1 }];
const gold = (amount: 5 | 10, id: string): Row => [id, String(amount), { type: "gold", amount }];
// R-233：仅批准当前版 p1–16 的逐卡四行，不扩大全局图标词典。
const rows: readonly (readonly Row[])[] = [
  [stress, negative(), blight, gold(10, "c870a39e26")],
  [negative("74fa6b5e99"), bleed, blight, gold(5, "c870a39e26")],
  [stress, negative(), blight, disease],
  [stress, negative("1ed8fca157"), positive(), trinket],
  [stress, negative(), blight, gold(10, "7317463edc")],
  [bleed, positive("b5c225c14d"), gold(5, "7317463edc"), trinket],
  [stress, negative(), blight, disease],
  [stress, blight, positive(), trinket],
  [negative(), blight, gold(5, "7317463edc"), trinket],
  [stress, negative(), blight, gold(10, "c870a39e26")],
  [negative(), blight, gold(5, "7317463edc"), positive("ce7303bafb")],
  [stress, bleed, disease, gold(10, "c870a39e26")],
  [stress, negative(), blight, provision],
  [stress, negative("74fa6b5e99"), disease, provision],
  [stress, negative(), blight, provision],
  [stress, bleed, blight, provision],
];
const names = [
  "Ancient Coffin",
  "Ancient Coffin",
  "Beast Carcass",
  "Eerie Spiderweb",
  "Left Luggage",
  "Left Luggage",
  "Mummified Remains",
  "Old Tree",
  "Old Tree",
  "Pristine Fountain",
  "Pristine Fountain",
  "Shallow Grave",
  "Shallow Grave",
  "Traveler’s Tent",
  "Troubling Effigy",
  "Troubling Effigy",
];

/** R-233 逐卡核准；校验来源、页码、图标和数字，不读取私有 PDF。 */
export function buildWealdCurios(raw: RawFile) {
  if (raw.category !== "curio" || raw.cards.length !== 16 || raw.n_copies_total !== 16)
    throw new Error("需要完整 Weald Curio raw");
  const cards = raw.cards.map((card) => {
    const front = card.faces.front;
    const page = front.page;
    const name = front.lines[0]?.text.replace(/\s*\{icon:[^}]+\}/g, "");
    if (
      front.file !== WEALD_CURIO_FRONT ||
      card.faces.back?.file !== WEALD_CURIO_BACK ||
      card.faces.back.page !== page ||
      card.source_set !== "extension" ||
      card.copies !== 1 ||
      JSON.stringify(card.pages) !== `[${page}]` ||
      name !== names[page - 1] ||
      !rows[page - 1]
    )
      throw new Error(`Weald Curio 来源、身份或副本不符：${card.id}`);
    return {
      id: card.id,
      name,
      copies: 1,
      text: front.lines
        .filter((line) => line.bbox[1] >= 16 && line.bbox[1] < 42)
        .map((line) => line.text)
        .join(" "),
      source: { front: front.file, back: card.faces.back.file, page },
      rows: rows[page - 1]!.map(([iconId, printed, effect]) => {
        if (
          !front.icons.some((icon) => icon.iconId === iconId) ||
          (printed.match(/\+?\d+t?/g) ?? []).some(
            (number) => !front.spans.some((span) => span.t.trim() === number),
          )
        )
          throw new Error(`Weald Curio 图标或数字漂移：${card.id} / ${iconId}`);
        const token = `{icon:${iconId}}`;
        return {
          iconId,
          printed:
            printed === "+1"
              ? `${token} +1`
              : printed === "1 · 3t"
                ? `1 ${token} 3t`
                : `${printed} ${token}`.trim(),
          effect,
          reason: null,
        };
      }),
    };
  });
  return wealdCurioFileSchema.parse({ schema: "ddbg-curio-v1", dictionaryVersion: "1.8", cards });
}
