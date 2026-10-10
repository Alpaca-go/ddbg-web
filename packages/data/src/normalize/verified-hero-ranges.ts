import type { NormalizedHeroSkillCard } from "./schema";
/** 已逐页对照印刷 44x68 SKILLS_FRONT p067 / p076；只附加两张获批图标的区间。 */
export function attachVerifiedHeroRanges(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    const names: Record<string, string> = {
      "hero_skill:p067": "Pistol Shot",
      "hero_skill:p076": "Tracking Shot",
    };
    const name = names[card.id];
    if (!name) return card;
    const ranges = card.unlabeled_numbers.filter(
      (item) =>
        item.anchor.type === "beside_icon" &&
        item.anchor.left_icon?.key === "range" &&
        ["confirmed", "confirmed_rulebook"].includes(item.anchor.left_icon.naming) &&
        item.anchor.inside_icon === null,
    );
    if (
      card.name !== name ||
      card.level !== 1 ||
      card.verification.unverified ||
      ranges.length !== 1 ||
      ranges[0]?.text !== "1-2" ||
      ranges[0].numeric !== null
    )
      throw new Error(`${card.id} 已复核区间与印刷数据不匹配`);
    return { ...card, verified_range: { min: 1, max: 2, source: "print_front" } };
  });
}
