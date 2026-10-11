import type { NormalizedHeroSkillCard } from "./schema";

/** 完整 SKILLS_FRONT p019；只附已复核数字，不改原始 numeric=null。 */
export function attachVerifiedHeroSupport(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    if (card.id !== "hero_skill:p019") return card;
    const line = card.effect_lines[1];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    const targetLine = card.effect_lines[0];
    const target = targetLine
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      card.name !== "Inspiring Cry" ||
      card.level !== 1 ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== 19 ||
      card.printed_labels.length ||
      card.stats_line !== null ||
      card.effect_lines.length !== 2 ||
      target !== "{range}0{target_hero}" ||
      targetLine?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      ) ||
      text !== "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1" ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error(`${card.id} 已复核支持效果与印刷数据不匹配`);
    return {
      ...card,
      verified_target_support: {
        lineIndex: 1,
        heal: 1,
        stress: -1,
        light: 1,
        source: "print_front" as const,
      },
    };
  });
}
