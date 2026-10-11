import type { NormalizedHeroSkillCard } from "./schema";

/** 完整 SKILLS_FRONT p016 / p067；只录已命名伤害图标和明文条件。 */
export function attachVerifiedHeroDamage(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    const reviewed = {
      "hero_skill:p016": {
        name: "Holy Lance",
        page: 16,
        lineIndex: 1,
        amount: 1,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p067": {
        name: "Pistol Shot",
        page: 67,
        lineIndex: 0,
        amount: 2,
        condition: "marked",
        suffix: "{mark}",
      },
    } as const;
    const entry = reviewed[card.id as keyof typeof reviewed];
    if (!entry) return card;
    const line = card.effect_lines[entry.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      card.name !== entry.name ||
      card.level !== 1 ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== entry.page ||
      text !== `{target_effects}{damage}+${entry.amount}vs${entry.suffix}` ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error(`${card.id} 已复核条件伤害与印刷数据不匹配`);
    return {
      ...card,
      verified_damage_bonus: {
        lineIndex: entry.lineIndex,
        amount: entry.amount,
        condition: entry.condition,
        source: "print_front",
      },
    };
  });
}
