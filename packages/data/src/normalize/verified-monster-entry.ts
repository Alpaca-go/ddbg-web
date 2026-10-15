import { verifiedMonsterSpeeds } from "./verified-monster-speeds";
import { verifiedMonsterStances } from "./verified-monster-stances";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { verifiedLargeMonsterFields } from "./verified-large-monster-fields";
import { verifiedMonsterProtection } from "./verified-monster-protection";

/** 高等级入场只读取具体卡的限定批准，不能靠同名/有数字/整卡verified绕过R-048。 */
export function hasApprovedHigherMonsterFields(card: {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly pages?: readonly number[];
  readonly speed?: number;
  readonly stanceGroups?: unknown;
  readonly innateProtection?: boolean;
}): boolean {
  const speed = [...verifiedMonsterSpeeds, ...verifiedLargeMonsterFields].find(
    (e) => e.id === card.id && e.level > 1,
  );
  const stance = [...verifiedMonsterStances, ...verifiedLargeMonsterFields].find(
    (e) => e.id === card.id && e.level > 1,
  );
  const protection = verifiedMonsterProtection.find((e) => e.id === card.id);
  const groups = monsterStanceGroupsSchema.safeParse(card.stanceGroups);
  return (
    !!speed &&
    !!stance &&
    card.level === speed.level &&
    card.level === stance.level &&
    card.name === speed.name &&
    card.name === stance.name &&
    card.speed === speed.speed &&
    (!protection || card.innateProtection === protection.value) &&
    Array.isArray(card.pages) &&
    card.pages.length === speed.pages.length &&
    card.pages.length === stance.pages.length &&
    card.pages.every((page, i) => page === speed.pages[i] && page === stance.pages[i]) &&
    groups.success &&
    JSON.stringify(groups.data) === JSON.stringify(stance.stanceGroups)
  );
}
