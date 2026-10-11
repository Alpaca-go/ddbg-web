import type { RawFile } from "../extract/raw";
import type { IconDictionary } from "../dictionary/schema";
import { CURIO_FRONT, CURIO_BACK, curioFileSchema } from "../curio";
import type { CurioEffect } from "../curio";

// 全 24 正面逐页核图。每一项保留一个实际效果行；不把艺术图、叠加的数字容器当效果。
// 缺标签的图标只存原 ID。decor / curio_picture 在效果栏出现时也不按无效果跳过（Q-60）。
type Row = readonly [iconId: string, printed: string, effect?: CurioEffect];
const stress: Row = ["12438e9a49", "+1", { type: "stress", amount: 1 }];
const bleed: Row = [
  "be17b4ee09",
  "1 · 3t",
  { type: "status", kind: "bleed", amount: 1, duration: 3 },
];
const blight: Row = [
  "a637867634",
  "1 · 3t",
  { type: "status", kind: "blight", amount: 1, duration: 3 },
];
const disease: Row = ["b4627031be", "", { type: "drawDisease", count: 1 }];
const gold = (amount: 5 | 10, iconId: string): Row => [
  iconId,
  String(amount),
  { type: "gold", amount },
];
const unknown = (iconId: string, printed = ""): Row => [iconId, printed];
const red = unknown("3fe634e723");
const redVariant = unknown("382acc9dc4");
const picture = unknown("85e094f269");
const provisions = unknown("ae45f5bcb3");
const rows: readonly (readonly Row[])[] = [
  [stress, unknown("449d2d43ed"), unknown("40c4cc438c", "2t"), gold(10, "4bcefdb4d9")],
  [stress, redVariant, blight, unknown("73ea0990dd", "2t")],
  [stress, red, disease, provisions],
  [stress, blight, unknown("40c4cc438c", "2t"), gold(5, "aa81338d06")],
  [stress, unknown("7b1a554877"), unknown("3cd8b97ff0", "2t"), picture],
  [red, unknown("12b6af97f2", "1 · 3t"), unknown("3a7dfcb577")],
  [bleed, unknown("1d9ad90d4a"), unknown("3ae4312868"), gold(5, "aa81338d06")],
  [red, disease, gold(10, "4bcefdb4d9"), provisions],
  [stress, red, bleed, gold(5, "4bcefdb4d9")],
  [blight, gold(5, "aa81338d06"), unknown("3e2792bc5b"), provisions],
  [stress, red, bleed, unknown("3a7dfcb577")],
  [stress, red, bleed, picture],
  [stress, redVariant, blight, gold(5, "aa81338d06")],
  [stress, redVariant, blight, disease],
  [red, bleed, gold(10, "4bcefdb4d9"), provisions],
  [blight, unknown("3ae4312868"), gold(5, "aa81338d06"), provisions],
  [stress, red, bleed, unknown("e546d025cd")],
  [stress, red, unknown("9b6a2b779d", "1 · 3t"), picture],
  [stress, red, unknown("9b6a2b779d", "1 · 3t"), gold(10, "4bcefdb4d9")],
  [stress, unknown("7b1a554877"), gold(10, "aa81338d06"), provisions],
  [stress, bleed, disease, gold(10, "aa81338d06")],
  [stress, red, bleed, picture],
  [stress, red, bleed, unknown("e546d025cd")],
  [stress, bleed, unknown("8b7f872f77"), picture],
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
        .replaceAll("don��t", "don’t"),
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
              : effect?.type;
        const verified =
          effect &&
          icon &&
          icon.key === key &&
          ["confirmed", "confirmed_rulebook"].includes(icon.status);
        const token = `{icon:${iconId}}`;
        const line =
          printed === "+1"
            ? `${token} +1`
            : printed === "1 · 3t"
              ? `1 ${token} 3t`
              : printed === "2t"
                ? `${token} 2t`
                : `${printed} ${token}`.trim();
        return {
          iconId,
          printed: line,
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
