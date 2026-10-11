import type { NormalizedHeroSkillCard } from "./schema";
/** 已逐页对照印刷 44x68 SKILLS_FRONT p013 / p067 / p076 / p088；只附加已命名图标的区间。 */
export function attachVerifiedHeroRanges(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    const reviewed: Record<string, { name: string; min: number; max: number }> = {
      "hero_skill:p013": { name: "Battle Heal", min: 0, max: 1 },
      "hero_skill:p067": { name: "Pistol Shot", min: 1, max: 2 },
      "hero_skill:p076": { name: "Tracking Shot", min: 1, max: 2 },
      "hero_skill:p088": { name: "Judgement", min: 1, max: 2 },
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
      card.level !== 1 ||
      card.verification.unverified ||
      ranges.length !== 1 ||
      ranges[0]?.text !== `${range.min}-${range.max}` ||
      ranges[0].numeric !== null
    )
      throw new Error(`${card.id} 已复核区间与印刷数据不匹配`);
    return { ...card, verified_range: { min: range.min, max: range.max, source: "print_front" } };
  });
}
