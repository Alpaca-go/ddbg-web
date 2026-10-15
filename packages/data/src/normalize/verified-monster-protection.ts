import type { NormalizedMonsterLargeCard, NormalizedMonsterMediumCard } from "./schema";

/** R-083：四卡限定批准；无映射不补默认值，不从全卡图标数量推断头部能力。 */
export const verifiedMonsterProtection = [
  { id: "monster_large:p001", name: "Bone Captain", pages: [1], value: false },
  { id: "monster_medium:p050", name: "Gargoyle", pages: [50, 51, 52], value: true },
  { id: "monster_medium:p053", name: "Rattler", pages: [53, 54, 55], value: false },
  { id: "monster_large:p003", name: "Ghoul", pages: [3], value: true },
] as const;

export function attachVerifiedMonsterProtection<
  T extends NormalizedMonsterMediumCard | NormalizedMonsterLargeCard,
>(cards: readonly T[], large = false): T[] {
  const entries = verifiedMonsterProtection.filter((e) =>
    e.id.startsWith(large ? "monster_large:" : "monster_medium:"),
  );
  for (const entry of entries) {
    const matches = cards.filter((c) => c.id === entry.id);
    const card = matches[0];
    if (
      matches.length !== 1 ||
      !card ||
      !("skills" in card) ||
      card.name !== entry.name ||
      card.level !== 2 ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages) ||
      (card.innateProtection !== undefined && card.innateProtection !== entry.value) ||
      (entry.value &&
        !["b9896e803d", "f88793a20e", "477735fe7b", "5cc5646eec"].every((id) =>
          card.front_icons.some((i) => i.iconId === id),
        ))
    )
      throw new Error(`常驻Protection身份或图标不符：${entry.id}`);
  }
  return cards.map((card) => {
    const entry = entries.find((e) => e.id === card.id);
    return entry ? { ...card, innateProtection: entry.value } : card;
  });
}
