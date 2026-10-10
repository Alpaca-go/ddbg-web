import type { NormalizedMonsterMediumCard } from "./schema";

/** 完整 monsters_medium_FRONT p007–009：Arbalist I Quarrel 对 Mark 伤害 +1。 */
export function attachVerifiedMonsterDamage(
  cards: readonly NormalizedMonsterMediumCard[],
): NormalizedMonsterMediumCard[] {
  return cards.map((card) => {
    if (card.id !== "monster_medium:p007") return card;
    if (
      !("skills" in card) ||
      card.name !== "Bone Arbalist" ||
      card.level !== 1 ||
      card.verification.unverified ||
      JSON.stringify(card.pages) !== "[7,8,9]"
    )
      throw new Error("Arbalist I 条件伤害映射卡名 / 等级 / 页码 / 验证状态不符");
    const matches = card.skills.filter((skill) => skill.slot === 1);
    const line = matches[0]?.effect_lines[0];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      matches.length !== 1 ||
      matches[0]?.name !== "Quarrel" ||
      text !== "{target_effects}{damage}+1vs{mark}" ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error("Arbalist I 条件伤害映射效果行漂移");
    return {
      ...card,
      skills: card.skills.map((skill) =>
        skill.slot === 1
          ? {
              ...skill,
              verified_damage_bonus: {
                lineIndex: 0,
                amount: 1,
                condition: "marked" as const,
                source: "print_front" as const,
              },
            }
          : skill,
      ),
    };
  });
}
