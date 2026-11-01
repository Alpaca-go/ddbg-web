import { normalizedMonsterLargeCardSchema } from "./schema";
import type { NormalizedMonsterLargeCard } from "./schema";

const CARD_ID = "monster_large:p020" as const;
const RANGE = { min: 0, max: 10, source: "print_front" as const };
const SLOTS = new Set([1, 2, 3]);

/** FRONT p020 三招 0–10 区间射程（#456；R-001 / R-048）。 */
export function attachVerifiedHeartOfDarknessSkillRanges(
  cards: readonly NormalizedMonsterLargeCard[],
): NormalizedMonsterLargeCard[] {
  return cards.map((card) => {
    if (card.id !== CARD_ID) return card;
    if (card.name !== "Heart of Darkness" || card.level !== 3 || card.pages.length !== 1)
      throw new Error("Heart of Darkness 卡身份不符（R-048）");
    return normalizedMonsterLargeCardSchema.parse({
      ...card,
      skills: card.skills.map((skill) => {
        if (!SLOTS.has(skill.slot)) return skill;
        const rangeText = skill.unlabeled_numbers.find(
          (item) =>
            item.anchor.type === "beside_icon" &&
            item.anchor.left_icon?.key === "range" &&
            item.numeric === null,
        )?.text;
        if (rangeText !== "0-10") throw new Error(`Heart of Darkness slot ${skill.slot} 射程漂移`);
        return { ...skill, verified_range: RANGE };
      }),
    });
  });
}
