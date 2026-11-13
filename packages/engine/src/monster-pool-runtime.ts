import { ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import {
  monsterPoolCatalogSchema,
  ruinsMonsterPool,
  type MonsterPoolCard,
} from "../../data/src/monster-pool";
import {
  wealdLevelOneMonsterInstancesSchema,
  type WealdLevelOneMonsterInstance,
} from "../../data/src/weald-monster-pool";

/** R-248：整场任务抽怪范围；未设时 Weald 仍为 W3 通用+当地混池。 */
export type MonsterDrawScope = "wealdLocalOnly";

export type MonsterPoolDeckState = {
  readonly cards: readonly MonsterPoolCard[];
  readonly location?: "ruins" | "weald";
  readonly wealdInstances?: readonly WealdLevelOneMonsterInstance[];
  readonly monsterDrawScope?: MonsterDrawScope;
  readonly permanentlyRemovedCombatCardIds?: readonly string[];
};

/** 战役怪物牌堆实例（扣除 Boss 威胁永久移出的战斗卡 id，catalog 仍保留完整 24 张）。 */
export function dungeonMonsterPoolThrough(pool: MonsterPoolDeckState, maxLevel: number) {
  const removed = new Set(pool.permanentlyRemovedCombatCardIds ?? []);
  return monsterPoolInstances(pool, maxLevel).filter((entry) => !removed.has(entry.cardId));
}

export function combatCardIdForPoolInstance(
  pool: MonsterPoolDeckState,
  instanceId: string,
): string | undefined {
  if (pool.location === "weald") {
    try {
      return monsterPoolInstances(pool, 1).find((entry) => entry.instanceId === instanceId)?.cardId;
    } catch {
      return undefined;
    }
  }
  if (
    (pool.location !== undefined && pool.location !== "ruins") ||
    pool.wealdInstances !== undefined
  )
    return undefined;
  const match = /^monster-deck:p(\d+)$/.exec(instanceId);
  if (!match) return undefined;
  const page = Number(match[1]);
  const card = pool.cards.find((entry) => entry.pages.includes(page));
  return card?.combatCardId;
}

/** 保留完整核心来源目录；出征实例由明确地点过滤，不将已选地点全部混池。 */
function monsterPoolInstances(pool: MonsterPoolDeckState, maxLevel: number) {
  if (pool.location === undefined || pool.location === "ruins") {
    if (pool.wealdInstances !== undefined) throw new Error("遗迹状态不能携带 Weald 实例");
    return ruinsMonsterPoolThrough(pool.cards, maxLevel);
  }
  if (pool.location !== "weald") throw new Error("未知怪物牌堆地点");
  if (maxLevel !== 1) throw new Error("Weald 仅核准 I 级怪物池");
  const core = monsterPoolCatalogSchema.parse(pool.cards);
  const local = wealdLevelOneMonsterInstancesSchema.parse(pool.wealdInstances);
  if (pool.monsterDrawScope === "wealdLocalOnly") return [...local];
  const commonIds = new Set(
    core
      .filter((card) => card.location === "common" && card.level === 1)
      .map((card) => card.combatCardId),
  );
  return [...ruinsMonsterPool(core, 1).filter((entry) => commonIds.has(entry.cardId)), ...local];
}
