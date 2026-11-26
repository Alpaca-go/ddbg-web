import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import { printedPageOf } from "./shared";
import type { RangeEntry } from "./types";

/** 已复核印刷区间 applier：按 canonical id 定位卡片并断言印刷数字。 */
export function applyRangeEntries(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly RangeEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return cards.map((card) => {
    const range = byId.get(card.id);
    if (!range) return card;
    const page = printedPageOf(range.id);
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
      card.pages.length !== 1 ||
      card.pages[0] !== page ||
      card.verification.unverified ||
      ranges.length !== 1 ||
      ranges[0]?.text !== `${range.min}-${range.max}` ||
      ranges[0].numeric !== null
    )
      throw new Error(`${card.id} 已复核区间与印刷数据不匹配`);
    if (card.rules?.range) return card;
    return { ...card, annotation_range: { min: range.min, max: range.max, source: "print_front" } };
  });
}
