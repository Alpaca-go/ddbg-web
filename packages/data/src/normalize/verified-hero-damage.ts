import type { NormalizedHeroSkillCard } from "./schema";

/** 完整 44x68 SKILLS_FRONT p067；只录已命名 damage / mark 图标的明确 +2。 */
export function attachVerifiedHeroDamage(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    if (card.id !== "hero_skill:p067") return card;
    const line = card.effect_lines[0];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      card.name !== "Pistol Shot" ||
      card.level !== 1 ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== 67 ||
      text !== "{target_effects}{damage}+2vs{mark}" ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error("Pistol I 已复核条件伤害与印刷数据不匹配");
    return {
      ...card,
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "marked",
        source: "print_front",
      },
    };
  });
}
