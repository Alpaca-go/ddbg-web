import { basicQuests } from "../../data/src/basic-quests";
import { monsterPoolCatalogSchema } from "../../data/src/monster-pool";
import type { DungeonState } from "./dungeon";
import { dungeonMonsterPoolThrough, type MonsterPoolDeckState } from "./monster-pool-runtime";

/** R9–R10、W3：目录完整不能代替地点一致；非法状态以拒绝返回，不抛出命令异常。 */
export function monsterPoolCatalogValidForLocation(
  pool: MonsterPoolDeckState | undefined,
  location: string,
  level: number,
): boolean {
  if (!pool) return false;
  if (location === "ruins")
    return (
      (pool.location === undefined || pool.location === "ruins") &&
      pool.wealdInstances === undefined &&
      monsterPoolCatalogSchema.safeParse(pool.cards).success
    );
  if (location !== "weald" || pool.location !== "weald" || level !== 1) return false;
  try {
    dungeonMonsterPoolThrough(pool, level);
    return true;
  } catch {
    return false;
  }
}

export function dungeonMonsterPoolCatalogValid(d: DungeonState): boolean {
  const region = basicQuests.find(
    (quest) => quest.id === d.questDistribution?.questId,
  )?.expeditionRegion;
  const location: string = !region || region === "darkestDungeon" ? "ruins" : region;
  if (location === "weald" && !d.contentPacks?.includes("weald")) return false;
  return monsterPoolCatalogValidForLocation(
    d.monsterPool,
    location,
    d.explorationSetup?.dungeonLevel ?? d.campaignLevel ?? 1,
  );
}

/** R25/R32：回村不补造缺卡；活动遭遇结束后，所有实例必须在余牌或弃牌中。 */
export function restingMonsterPoolValid(d: DungeonState): boolean {
  const pool = d.monsterPool;
  if (!pool) return true; // 旧无怪物池沙盒保持原行为。
  if (
    !dungeonMonsterPoolCatalogValid(d) ||
    pool.active ||
    (pool.remaining === null && pool.discarded.length)
  )
    return false;
  try {
    const expected = dungeonMonsterPoolThrough(
      pool,
      d.explorationSetup?.dungeonLevel ?? d.campaignLevel ?? 1,
    ).map((entry) => entry.instanceId);
    const actual = [...(pool.remaining ?? expected), ...pool.discarded];
    return (
      actual.length === expected.length &&
      new Set(actual).size === expected.length &&
      actual.every((id) => expected.includes(id))
    );
  } catch {
    return false;
  }
}
