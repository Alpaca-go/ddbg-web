import type { NormalizedHeroSkillCard } from "../schema";
import type { RangeEntry } from "./types";

/** 已复核印刷区间 applier：按页码（Musketeer 单独前缀）定位卡片并断言印刷数字。 */
export function applyRangeEntries(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly RangeEntry[],
): NormalizedHeroSkillCard[] {
  const byPage = new Map(
    entries.map((entry) => [
      `${entry.id.startsWith("hero_skill:musketeer:") ? "M" : ""}${Number(entry.id.slice(-3))}`,
      entry,
    ]),
  );
  return cards.map((card) => {
    const range = byPage.get(`${card.hero === "MUSKETEER" ? "M" : ""}${card.pages[0]}`);
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
      card.level !== range.level ||
      card.verification.unverified ||
      ranges.length !== 1 ||
      ranges[0]?.text !== `${range.min}-${range.max}` ||
      ranges[0].numeric !== null
    )
      throw new Error(`${card.id} 已复核区间与印刷数据不匹配`);
    if (card.rules?.range) return card;
    return { ...card, verified_range: { min: range.min, max: range.max, source: "print_front" } };
  });
}
