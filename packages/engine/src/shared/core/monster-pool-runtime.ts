import { ruinsMonsterPoolThrough } from "../../../../data/src/core/monsters/monster-pool";
import {
  monsterPoolCatalogSchema,
  ruinsMonsterPool,
  type MonsterPoolCard,
} from "../../../../data/src/core/monsters/monster-pool";
import {
  wealdLevelOneMonsterInstancesSchema,
  wealdHigherMonsterInstancesSchema,
  type WealdLevelOneMonsterInstance,
} from "../../../../data/src/weald/monsters/monster-pool";

/** R-248：整场任务抽怪范围；未设时 Weald 仍为 W3 通用+当地混池。 */
export type MonsterDrawScope = "wealdLocalOnly";

export type MonsterPoolDeckState = {
  readonly cards: readonly MonsterPoolCard[];
  readonly location?: "ruins" | "weald";
  readonly wealdInstances?: readonly WealdLevelOneMonsterInstance[];
  readonly wealdSourceVersion?: "higher-v1";
  readonly wealdMonsterLevel?: 2 | 3;
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
      return monsterPoolInstances(pool, pool.wealdMonsterLevel ?? 1).find(
        (entry) => entry.instanceId === instanceId,
      )?.cardId;
    } catch {
      return undefined;
    }
  }
  if (
    (pool.location !== undefined && pool.location !== "ruins") ||
    pool.wealdInstances !== undefined ||
    pool.wealdSourceVersion !== undefined ||
    pool.wealdMonsterLevel !== undefined
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
    if (
      pool.wealdInstances !== undefined ||
      pool.wealdSourceVersion !== undefined ||
      pool.wealdMonsterLevel !== undefined
    )
      throw new Error("遗迹状态不能携带 Weald 实例或版本");
    return ruinsMonsterPoolThrough(pool.cards, maxLevel);
  }
  if (pool.location !== "weald") throw new Error("未知怪物牌堆地点");
  const higher = pool.wealdSourceVersion === "higher-v1";
  if (
    higher
      ? (maxLevel !== 2 && maxLevel !== 3) || pool.wealdMonsterLevel !== maxLevel
      : maxLevel !== 1 ||
        pool.wealdMonsterLevel !== undefined ||
        pool.wealdSourceVersion !== undefined
  )
    throw new Error("Weald 怪物池等级与显式版本不符");
  const core = monsterPoolCatalogSchema.parse(pool.cards);
  const local = higher
    ? wealdHigherMonsterInstancesSchema(maxLevel as 2 | 3).parse(pool.wealdInstances)
    : wealdLevelOneMonsterInstancesSchema.parse(pool.wealdInstances);
  if (pool.monsterDrawScope === "wealdLocalOnly") return [...local];
  const commonIds = new Set(
    core
      .filter((card) => card.location === "common" && card.level === maxLevel)
      .map((card) => card.combatCardId),
  );
  return [
    ...ruinsMonsterPool(core, maxLevel).filter((entry) => commonIds.has(entry.cardId)),
    ...local,
  ];
}
