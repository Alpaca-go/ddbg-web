import monsterPoolFile from "../../normalized/corebox/monster_pool.json";
import { monsterPoolFileSchema, ruinsMonsterPoolThrough } from "../monster-pool";
import { hasApprovedHigherMonsterFields } from "./verified-monster-entry";

const poolCards = monsterPoolFileSchema.parse(monsterPoolFile).cards;

type PoolMonsterCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly pages: readonly number[];
  readonly speed?: number | undefined;
  readonly stanceGroups?: unknown;
  readonly innateProtection?: boolean | undefined;
  readonly verification: { readonly unverified?: boolean };
};

/** Common+Ruins 牌堆内、战役 1..maxLevel 累加出现的去重战斗卡 id（R35）。 */
export function ruinsPoolCombatCardIds(maxLevel: 1 | 2 | 3): readonly string[] {
  const instances = ruinsMonsterPoolThrough(poolCards, maxLevel);
  return [...new Set(instances.map((entry) => entry.cardId))].sort();
}

export type RuinsPoolAdmissionRow = {
  readonly combatCardId: string;
  readonly poolLevel: number;
  readonly missingBattleFields: readonly string[];
  readonly hasApprovedHigherMonsterFields: boolean;
  readonly catalogHasSpeedStance: boolean;
  readonly catalogUnverified: boolean;
};

/** C-008 盘点：只读牌堆身份 + 目录字段，不发明 Speed/选招。 */
export function ruinsPoolAdmissionRows(
  monsters: readonly PoolMonsterCatalogEntry[],
  maxLevel: 2 | 3,
): readonly RuinsPoolAdmissionRow[] {
  return ruinsPoolCombatCardIds(maxLevel).map((combatCardId) => {
    const poolEntry = poolCards.find((c) => c.combatCardId === combatCardId)!;
    const card = monsters.find((m) => m.id === combatCardId)!;
    const catalogHasSpeedStance = card.speed !== undefined && card.stanceGroups !== undefined;
    return {
      combatCardId,
      poolLevel: poolEntry.level,
      missingBattleFields: poolEntry.missingBattleFields,
      hasApprovedHigherMonsterFields:
        card.level > 1
          ? hasApprovedHigherMonsterFields(
              card as Parameters<typeof hasApprovedHigherMonsterFields>[0],
            )
          : false,
      catalogHasSpeedStance,
      catalogUnverified: card.verification.unverified === true,
    };
  });
}

/** R-082/R-083：DL2 牌堆内全部 II 级普通遭遇战斗卡（5 medium + 2 large 映射）。 */
export const RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS = [
  "monster_medium:p013",
  "monster_medium:p050",
  "monster_medium:p053",
  "monster_large:p001",
  "monster_large:p003",
] as const;

export function isRuinsNormalPoolApprovedHigherCombat(card: {
  readonly id: string;
  readonly level: number;
}): boolean {
  if (card.level <= 1) return true;
  return (RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS as readonly string[]).includes(card.id);
}
