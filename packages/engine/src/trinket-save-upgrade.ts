import raw from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
/** R-127只修正明确批准的卡面元数据；绝不替换持牌、牌序、选择、RNG或英雄数据。 */
const cards = normalizedTrinketFileSchema.parse(raw).cards;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
const affected = new Set([
  "trinket:p010",
  "trinket:p016",
  "trinket:p019",
  "trinket:p029",
  "trinket:p038",
]);
const oldIcons: Record<string, { key: string; meaning_en: string; meaning_zh: string }> = {
  "22c0a26f50": {
    key: "trinket_stat_glyph",
    meaning_en: "Trinket stat glyph (Speed Stone) – possibly Speed",
    meaning_zh: "饰品属性图标（速度石）– 可能为速度",
  },
  b7d0cfd524: {
    key: "trinket_picture",
    meaning_en: "Trinket picture (likely art)",
    meaning_zh: "饰品插图（疑似插画）",
  },
  "206c655597": {
    key: "compare_lte",
    meaning_en: "Less-than comparison (trinket light condition)",
    meaning_zh: "小于比较符（饰品光照条件）",
  },
};
function oldMetadata(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(oldMetadata);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return {
      ...Object.fromEntries(Object.entries(o).map(([k, x]) => [k, oldMetadata(x)])),
      ...(typeof o.iconId === "string" ? oldIcons[o.iconId] : {}),
    };
  }
  return v;
}
const approved = new Map<string, unknown>();
for (const card of cards.filter((c) => affected.has(c.id))) {
  const old = oldMetadata(card) as typeof card;
  if (card.id === "trinket:p016")
    old.upright_half.effect_lines = [
      [{ type: "text", text: "When you suffer a" }],
      [{ type: "text", text: "discard it immediately" }],
    ];
  approved.set(canonical(old), card);
}
export function upgradeTrinketR127Metadata(snapshot: unknown): unknown {
  if (Array.isArray(snapshot)) return snapshot.map(upgradeTrinketR127Metadata);
  if (!snapshot || typeof snapshot !== "object") return snapshot;
  const o = snapshot as Record<string, unknown>;
  if (typeof o.id === "string" && affected.has(o.id)) {
    const replacement = approved.get(canonical(o));
    if (replacement) return replacement;
  }
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, upgradeTrinketR127Metadata(v)]));
}
