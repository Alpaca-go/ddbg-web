import type { NormalizedHeroSkillCard, NormalizedIcon } from "./schema";

// R-206，按卡号记录审校稿中的例外。每组包含同一技能的 I–III 级。
const reviewedCorePages = {
  RD: [211, 214, 331],
  SRDA: [
    217, 220, 238, 241, 247, 250, 262, 265, 268, 271, 283, 295, 298, 301, 304, 313, 319, 340, 343,
    349,
  ],
  RDA: [229, 235, 244, 286, 316, 328, 334],
  A: [280, 292, 322, 325],
  SR: [307, 310, 346],
  SRD: [337, 352],
} as const;

const reviewedMusketeerPages = { SR: [1, 4, 7, 10, 16], SRDA: [13, 19] } as const;
const slots = [
  ["S", "support"],
  ["R", "ranged"],
  ["D", "defensive"],
  ["A", "aggressive"],
] as const;

export function attachReviewedHeroStances(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const catalog = new Map<string, string>();
  for (const [prefix, groups] of [
    ["hero_skill:p", reviewedCorePages],
    ["hero_skill:musketeer:p", reviewedMusketeerPages],
  ] as const) {
    for (const [stances, starts] of Object.entries(groups)) {
      for (const start of starts) {
        for (let page = start; page < start + 3; page += 1) {
          catalog.set(`${prefix}${String(page).padStart(3, "0")}`, stances);
        }
      }
    }
  }
  const references = new Map<string, NormalizedIcon>();
  for (const icon of cards.flatMap((card) => card.top_row_icons)) {
    if (icon.key && icon.naming === "confirmed" && icon.key.startsWith("stance_")) {
      references.set(icon.key, icon);
    }
  }
  return cards.map((card) => {
    const stances = catalog.get(card.id);
    if (!stances) return card;
    const row = card.top_row_icons.filter((icon) => icon.key !== "text_plate");
    if (
      row.length !== slots.length ||
      row.some((icon, index) => !icon.key?.startsWith(`stance_${slots[index]![1]}_`))
    ) {
      throw new Error(`${card.id} 审校姿态行漂移（R-048 / R-206）`);
    }
    return {
      ...card,
      top_row_icons: card.top_row_icons.map((icon) => {
        if (icon.key === "text_plate") return icon;
        const [code, slot] = slots[row.indexOf(icon)]!;
        const key = `stance_${slot}_${stances.includes(code) ? "lit" : "unlit"}`;
        const reference = references.get(key);
        if (!reference) throw new Error(`缺少已确认的姿态图标 ${key}（R-048）`);
        return reference;
      }),
    };
  });
}
