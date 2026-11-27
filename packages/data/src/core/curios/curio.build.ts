import { printIcon } from "../../shared/print-icons";
import { formatCurioPrintedRow } from "../../shared/curios/printed-row";
import type { RawFile } from "../../shared/extract/raw";
import type { IconDictionary } from "../../shared/dictionary/schema";
import { CURIO_FRONT, CURIO_BACK, curioFileSchema } from "./curio";
import type { CurioEffect } from "./curio";

// 全 24 正面逐页核图。每一项保留一个实际效果行；不把艺术图、叠加的数字容器当效果。
// 缺标签的图标只存原 ID。decor / curio_picture 在效果栏出现时也不按无效果跳过（Q-60）。
type Row = readonly [iconId: string, printed: string, effect?: CurioEffect];
const stress: Row = [printIcon("stress", 129), "+1", { type: "stress", amount: 1 }];
const bleed: Row = [
  printIcon("bleed", 211),
  "1 · 3t",
  { type: "status", kind: "bleed", amount: 1, duration: 3 },
];
const blight: Row = [
  printIcon("blight", 294),
  "1 · 3t",
  { type: "status", kind: "blight", amount: 1, duration: 3 },
];
const disease: Row = [printIcon("disease", 401), "", { type: "drawDisease", count: 1 }];
const gold = (amount: 5 | 10, iconId: string): Row => [
  iconId,
  String(amount),
  { type: "gold", amount },
];
// R-064 / Q-60：Kyries 批准 17 个 hash 与 01–24 手打效果行，未列含义不推广。
const approvedEffects: Record<string, CurioEffect> = {
  ...Object.fromEntries(
    [
      printIcon("draw_negative_quirk", 978),
      printIcon("draw_negative_quirk", 476),
      printIcon("draw_negative_quirk", 180),
      printIcon("draw_negative_quirk", 700),
    ].map((id) => [id, { type: "drawQuirk", polarity: "negative", count: 1 } as const]),
  ),
  ...Object.fromEntries(
    [
      printIcon("draw_positive_quirk", 671),
      printIcon("draw_positive_quirk", 673),
      printIcon("draw_positive_quirk", 979),
      printIcon("draw_positive_quirk", 980),
    ].map((id) => [id, { type: "drawQuirk", polarity: "positive", count: 1 } as const]),
  ),
  ...Object.fromEntries(
    [printIcon("draw_trinket", 331), printIcon("draw_trinket", 981)].map((id) => [
      id,
      { type: "drawTrinket", count: 1 } as const,
    ]),
  ),
  ...Object.fromEntries(
    [printIcon("bleed", 711), printIcon("bleed", 977)].map((id) => [id, bleed[2]!]),
  ),
  [printIcon("disease", 742)]: disease[2]!,
  [printIcon("roll_for_provisions")]: { type: "rollProvision", count: 1 },
  [printIcon("debuff", 674)]: { type: "status", kind: "debuff", duration: 2 },
  [printIcon("buff", 982)]: { type: "status", kind: "buff", duration: 2 },
  [printIcon("buff", 983)]: { type: "status", kind: "buff", duration: 2 },
};
const approved = (iconId: string, printed = ""): Row => {
  const effect = approvedEffects[iconId];
  if (!effect) throw new Error(`未列入 R-064 的 Curio hash：${iconId}`);
  return [iconId, printed, effect];
};
const red = approved(printIcon("draw_negative_quirk", 180));
const redVariant = approved(printIcon("draw_negative_quirk", 476));
const picture = approved(printIcon("draw_trinket", 331));
const provisions = approved(printIcon("roll_for_provisions"));
const rows: readonly (readonly Row[])[] = [
  [
    stress,
    approved(printIcon("draw_negative_quirk", 978)),
    approved(printIcon("debuff", 674), "2t"),
    gold(10, printIcon("gold", 325)),
  ],
  [stress, redVariant, blight, approved(printIcon("buff", 982), "2t")],
  [stress, red, disease, provisions],
  [stress, blight, approved(printIcon("debuff", 674), "2t"), gold(5, printIcon("gold", 264))],
  [
    stress,
    approved(printIcon("draw_negative_quirk", 700)),
    approved(printIcon("buff", 983), "2t"),
    picture,
  ],
  [
    red,
    approved(printIcon("bleed", 977), "1 · 3t"),
    approved(printIcon("draw_positive_quirk", 671)),
  ],
  [
    bleed,
    approved(printIcon("draw_trinket", 981)),
    approved(printIcon("draw_positive_quirk", 673)),
    gold(5, printIcon("gold", 264)),
  ],
  [red, disease, gold(10, printIcon("gold", 325)), provisions],
  [stress, red, bleed, gold(5, printIcon("gold", 325))],
  [
    blight,
    gold(5, printIcon("gold", 264)),
    approved(printIcon("draw_positive_quirk", 979)),
    provisions,
  ],
  [stress, red, bleed, approved(printIcon("draw_positive_quirk", 671))],
  [stress, red, bleed, picture],
  [stress, redVariant, blight, gold(5, printIcon("gold", 264))],
  [stress, redVariant, blight, disease],
  [red, bleed, gold(10, printIcon("gold", 325)), provisions],
  [
    blight,
    approved(printIcon("draw_positive_quirk", 673)),
    gold(5, printIcon("gold", 264)),
    provisions,
  ],
  [stress, red, bleed, approved(printIcon("disease", 742))],
  [stress, red, approved(printIcon("bleed", 711), "1 · 3t"), picture],
  [stress, red, approved(printIcon("bleed", 711), "1 · 3t"), gold(10, printIcon("gold", 325))],
  [
    stress,
    approved(printIcon("draw_negative_quirk", 700)),
    gold(10, printIcon("gold", 264)),
    provisions,
  ],
  [stress, bleed, disease, gold(10, printIcon("gold", 264))],
  [stress, red, bleed, picture],
  [stress, red, bleed, approved(printIcon("disease", 742))],
  [stress, bleed, approved(printIcon("draw_positive_quirk", 980)), picture],
];

/** 印刷数字 + 已批准词典才形成效果；词典退回未确认时同样退回 null。 */
export function buildCurios(raw: RawFile, dictionary: IconDictionary) {
  if (raw.category !== "curio" || raw.cards.length !== 24)
    throw new Error("需要完整核心盒 Curio raw");
  const lookup = new Map(dictionary.icons.map((i) => [i.iconId, i]));
  const cards = raw.cards.map((c) => {
    const f = c.faces.front;
    if (f.file !== CURIO_FRONT || c.faces.back?.file !== CURIO_BACK || c.copies !== 1)
      throw new Error("Curio 来源或份数不一致");
    const effectRows = rows[f.page - 1];
    if (!effectRows) throw new Error("Curio 印刷页未核对");
    return {
      id: c.id,
      copies: c.copies,
      name: f.lines[0]!.text.replace(/\s*\{icon:[^}]+\}/g, ""),
      text: f.lines
        .filter((l) => l.bbox[1] >= 16 && l.bbox[1] < 42)
        .map((l) => l.text)
        .join(" ")
        .replaceAll("family��s", "family’s")
        .replaceAll("don��t", "don’t")
        .replace("spring- loaded", "spring-loaded"),
      source: { front: f.file, back: c.faces.back!.file, page: f.page },
      rows: effectRows.map(([iconId, printed, effect]) => {
        if (!f.icons.some((i) => i.iconId === iconId))
          throw new Error(`${c.id} 缺少已核图的效果图标 ${iconId}`);
        const numbers = printed.match(/\+?\d+t?/g) ?? [];
        if (numbers.some((n) => !f.spans.some((s) => s.t.trim() === n)))
          throw new Error(`${c.id} 印刷数字与已核图转录不一致`);
        const icon = lookup.get(iconId);
        const key =
          effect?.type === "status"
            ? effect.kind
            : effect?.type === "drawDisease"
              ? "disease"
              : effect?.type === "drawQuirk"
                ? `draw_${effect.polarity}_quirk`
                : effect?.type === "drawTrinket"
                  ? "draw_trinket"
                  : effect?.type === "rollProvision"
                    ? "roll_for_provisions"
                    : effect?.type;
        const verified =
          effect &&
          icon &&
          icon.key === key &&
          ["confirmed", "confirmed_rulebook"].includes(icon.status);
        return {
          iconId,
          printed: formatCurioPrintedRow(printed, iconId),
          effect: verified ? effect : null,
          reason: verified
            ? null
            : `Q-60 · ${icon?.key ?? "词典未收录"} · ${icon?.status ?? "unverified"}`,
        };
      }),
    };
  });
  return curioFileSchema.parse({ schema: "ddbg-curio-v1", dictionaryVersion: "1.8", cards });
}
