import type { NormalizedMonsterMediumCard } from "./schema";
/** 完整 monsters_medium_FRONT p004–006：Courtier I Tempting Goblet 的已命名压力 +1。 */
export function attachVerifiedMonsterStress(
  cards: readonly NormalizedMonsterMediumCard[],
): NormalizedMonsterMediumCard[] {
  return cards.map((card) => {
    if (card.id !== "monster_medium:p004") return card;
    if (
      !("skills" in card) ||
      card.name !== "Bone Courtier" ||
      card.level !== 1 ||
      card.verification.unverified ||
      JSON.stringify(card.pages) !== "[4,5,6]"
    )
      throw new Error("Courtier I 压力映射卡名 / 等级 / 页码 / 验证状态不符");
    const matches = card.skills.filter((skill) => skill.slot === 1);
    const line = matches[0]?.effect_lines[0];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      matches.length !== 1 ||
      matches[0]?.name !== "Tempting Goblet" ||
      text !== "{target_effects}{stress}+1" ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error("Courtier I 压力映射效果行漂移");
    return {
      ...card,
      skills: card.skills.map((skill) =>
        skill.slot === 1
          ? {
              ...skill,
              verified_target_stress: { lineIndex: 0, amount: 1, source: "print_front" },
            }
          : skill,
      ),
    };
  });
}
