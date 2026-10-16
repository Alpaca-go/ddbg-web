import type { NormalizedHeroSkillCard } from "./schema";
/** 四核心完整印刷逐页核对；只附加已命名图标的明确区间（R-048）。 */
export function attachVerifiedHeroRanges(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    const reviewed: Record<string, { name: string; level: number; min: number; max: number }> = {
      "hero_skill:p013": {
        name: "Battle Heal",
        level: 1,
        min: 0,
        max: 1,
      },
      "hero_skill:p014": {
        name: "Battle Heal",
        level: 2,
        min: 0,
        max: 1,
      },
      "hero_skill:p038": {
        name: "Adrenaline Rush",
        level: 2,
        min: 0,
        max: 1,
      },
      "hero_skill:p039": {
        name: "Adrenaline Rush",
        level: 3,
        min: 0,
        max: 1,
      },
      "hero_skill:p067": {
        name: "Pistol Shot",
        level: 1,
        min: 1,
        max: 2,
      },
      "hero_skill:p058": {
        name: "Finish Him",
        level: 1,
        min: 0,
        max: 1,
      },
      "hero_skill:p055": {
        name: "Flashbang",
        level: 1,
        min: 1,
        max: 2,
      },
      "hero_skill:p068": {
        name: "Pistol Shot",
        level: 2,
        min: 1,
        max: 2,
      },
      "hero_skill:p069": {
        name: "Pistol Shot",
        level: 3,
        min: 1,
        max: 2,
      },
      "hero_skill:p073": {
        name: "Grapeshot Blast",
        level: 1,
        min: 0,
        max: 1,
      },
      "hero_skill:p074": {
        name: "Grapeshot Blast",
        level: 2,
        min: 0,
        max: 1,
      },
      "hero_skill:p075": {
        name: "Grapeshot Blast",
        level: 3,
        min: 0,
        max: 1,
      },
      "hero_skill:p076": {
        name: "Tracking Shot",
        level: 1,
        min: 1,
        max: 2,
      },
      "hero_skill:p077": {
        name: "Tracking Shot",
        level: 2,
        min: 1,
        max: 2,
      },
      "hero_skill:p078": {
        name: "Tracking Shot",
        level: 3,
        min: 1,
        max: 2,
      },
      "hero_skill:p088": {
        name: "Judgement",
        level: 1,
        min: 1,
        max: 2,
      },
      "hero_skill:p089": {
        name: "Judgement",
        level: 2,
        min: 1,
        max: 2,
      },
      "hero_skill:p090": {
        name: "Judgement",
        level: 3,
        min: 1,
        max: 2,
      },
      "hero_skill:p094": {
        name: "Divine Grace",
        level: 1,
        min: 0,
        max: 1,
      },
      "hero_skill:p095": {
        name: "Divine Grace",
        level: 2,
        min: 0,
        max: 1,
      },
      "hero_skill:p096": {
        name: "Divine Grace",
        level: 3,
        min: 0,
        max: 1,
      },
      "hero_skill:p100": {
        name: "Illumination",
        level: 1,
        min: 1,
        max: 2,
      },
      "hero_skill:p101": {
        name: "Illumination",
        level: 2,
        min: 1,
        max: 2,
      },
      "hero_skill:p102": {
        name: "Illumination",
        level: 3,
        min: 1,
        max: 2,
      },
    };
    const range = reviewed[card.id];
    if (!range) return card;
    const ranges = card.unlabeled_numbers.filter(
      (item) =>
        item.anchor.type === "beside_icon" &&
        item.anchor.left_icon?.key === "range" &&
        ["confirmed", "confirmed_rulebook"].includes(item.anchor.left_icon.naming) &&
        item.anchor.inside_icon === null,
    );
    if (
      card.name !== range.name ||
      card.level !== range.level ||
      card.verification.unverified ||
      ranges.length !== 1 ||
      ranges[0]?.text !== `${range.min}-${range.max}` ||
      ranges[0].numeric !== null
    )
      throw new Error(`${card.id} 已复核区间与印刷数据不匹配`);
    return { ...card, verified_range: { min: range.min, max: range.max, source: "print_front" } };
  });
}
