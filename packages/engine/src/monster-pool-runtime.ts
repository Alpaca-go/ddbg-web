import { ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import type { MonsterPoolCard } from "../../data/src/monster-pool";

export type MonsterPoolDeckState = {
  readonly cards: readonly MonsterPoolCard[];
  readonly permanentlyRemovedCombatCardIds?: readonly string[];
};

/** 战役怪物牌堆实例（扣除 Boss 威胁永久移出的战斗卡 id，catalog 仍保留完整 24 张）。 */
export function dungeonMonsterPoolThrough(pool: MonsterPoolDeckState, maxLevel: number) {
  const removed = new Set(pool.permanentlyRemovedCombatCardIds ?? []);
  return ruinsMonsterPoolThrough(pool.cards, maxLevel).filter((entry) => !removed.has(entry.cardId));
}

export function combatCardIdForPoolInstance(
  pool: Pick<MonsterPoolDeckState, "cards">,
  instanceId: string,
): string | undefined {
  const match = /^monster-deck:p(\d+)$/.exec(instanceId);
  if (!match) return undefined;
  const page = Number(match[1]);
  const card = pool.cards.find((entry) => entry.pages.includes(page));
  return card?.combatCardId;
}
