import {
  normalizedMonsterLargeFileSchema,
  normalizedMonsterMediumFileSchema,
  type NormalizedMonsterLargeCard,
  type NormalizedMonsterMediumCard,
} from "../../../../data/src/shared/schema";
import type { MonsterCardView } from "../../shared/core/monster-skill";

type WarrensCombatCard = Extract<NormalizedMonsterMediumCard, { skills: unknown }> | NormalizedMonsterLargeCard;

/** 将 Warrens 规范化怪物投影为战役 catalog 条目；战斗核准仍为 false。 */
export function buildWarrensMonsterCatalogViews(
  mediumInput: unknown,
  largeInput: unknown,
): (MonsterCardView & { readonly name: string; readonly level: number; readonly dodge: number })[] {
  const medium = normalizedMonsterMediumFileSchema.parse(mediumInput);
  const large = normalizedMonsterLargeFileSchema.parse(largeInput);
  for (const file of [medium, large]) {
    if (
      file.sources.raw !== `extract/extension/warrens/raw/${file.category}.json` ||
      file.sources.parsed !== `extract/extension/warrens/parsed/${file.category}.json`
    )
      throw new Error("Warrens 怪物目录来源不符");
  }
  const cards = [
    ...medium.cards.filter((card): card is WarrensCombatCard => "skills" in card),
    ...large.cards,
  ];
  return cards.map(
    (card) =>
      ({
        ...card,
        name: card.name,
        level: card.level,
        dodge: 0,
      }) as MonsterCardView & { readonly name: string; readonly level: number; readonly dodge: number },
  );
}
