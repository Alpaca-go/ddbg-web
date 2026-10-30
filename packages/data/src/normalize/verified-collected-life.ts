import type { NormalizedMonsterMediumCard } from "./schema";

// 当前版 monsters_medium_FRONT p095–103；parsed.hp 误取 footer 技能编号 1。
const printed = [
  ["monster_medium:p095", "Collected Highwayman", 1, 11],
  ["monster_medium:p096", "Collected Highwayman", 2, 15],
  ["monster_medium:p097", "Collected Highwayman", 3, 21],
  ["monster_medium:p098", "Collected Man-at-Arms", 1, 12],
  ["monster_medium:p099", "Collected Man-at-Arms", 2, 16],
  ["monster_medium:p100", "Collected Man-at-Arms", 3, 22],
  ["monster_medium:p101", "Collected Vestal", 1, 10],
  ["monster_medium:p102", "Collected Vestal", 2, 14],
  ["monster_medium:p103", "Collected Vestal", 3, 20],
] as const;

export function attachVerifiedCollectedLife(cards: readonly NormalizedMonsterMediumCard[]) {
  return cards.map((card) => {
    const row = printed.find(([id]) => id === card.id);
    if (!row || !("skills" in card)) return card;
    const numbers = card.header_unlabeled_numbers.filter(
      (n) =>
        n.anchor.type === "beside_icon" &&
        n.anchor.inside_icon?.key === "life" &&
        n.anchor.inside_icon.naming === "confirmed",
    );
    if (
      card.name !== row[1] ||
      card.level !== row[2] ||
      numbers.length !== 1 ||
      numbers[0]!.numeric !== row[3]
    )
      throw new Error(`Collected Life 卡面漂移：${card.id}`);
    const anchor = numbers[0]!.anchor;
    if (anchor.type !== "beside_icon" || !anchor.inside_icon) throw new Error("Life 图标缺失");
    return { ...card, life: row[3], life_icon: anchor.inside_icon };
  });
}
