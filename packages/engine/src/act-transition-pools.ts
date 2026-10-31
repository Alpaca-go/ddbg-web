import trinketSource from "../../data/normalized/corebox/trinket.json";
import { monsterPoolCatalogSchema, ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import type { DungeonState } from "./dungeon";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import {
  switchTrinketDungeonLevel,
  trinketPoolProblem,
  type TrinketPool,
} from "./trinket-acquisition";

const trinkets = normalizedTrinketFileSchema.parse(trinketSource).cards;
type MonsterPool = NonNullable<DungeonState["monsterPool"]>;
export type ActPoolSwitch =
  | { readonly kind: "blocked"; readonly reason: string }
  | { readonly kind: "ready"; readonly monsterPool: MonsterPool; readonly trinkets: TrinketPool };

/** R35/R-037：只切换池数据，不检查胜利、不洗牌、不消费RNG或写入GameState。 */
export function switchRuinsActPools(
  fromLevel: 1 | 2,
  monsterPool: MonsterPool,
  trinketPool: TrinketPool,
  heroes: DungeonState["heroes"],
): ActPoolSwitch {
  const blocked = (reason: string): ActPoolSwitch => ({ kind: "blocked", reason });
  if (
    ![1, 2].includes(fromLevel) ||
    !monsterPoolCatalogSchema.safeParse(monsterPool.cards).success ||
    monsterPool.active
  )
    return blocked("升幕需要完整怪物目录、有效源等级且无活动遭遇");
  const removed = monsterPool.permanentlyRemovedCombatCardIds ?? [];
  const oldCatalog = ruinsMonsterPoolThrough(monsterPool.cards, fromLevel);
  if (
    new Set(removed).size !== removed.length ||
    removed.some((id) => !oldCatalog.some((m) => m.cardId === id))
  )
    return blocked("怪物永久移出记录重复或含非当前/先前等级卡牌");
  const expected = dungeonMonsterPoolThrough(monsterPool, fromLevel).map((m) => m.instanceId);
  if (monsterPool.remaining === null && monsterPool.discarded.length)
    return blocked("未初始化怪物堆不能同时有弃牌");
  const actual = [...(monsterPool.remaining ?? expected), ...monsterPool.discarded];
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    actual.some((id) => !expected.includes(id))
  )
    return blocked("怪物池缺失、重复、含未来等级或已永久移出实例");
  if (trinketPool.level !== fromLevel) return blocked("饰品池等级与升幕源等级不符");
  const issue = trinketPoolProblem(trinketPool, heroes);
  if (issue) return blocked(issue);
  const nextLevel = (fromLevel + 1) as 2 | 3;
  const switched = switchTrinketDungeonLevel(trinketPool, trinkets, nextLevel);
  if ("reason" in switched) return blocked(switched.reason);
  const afterIssue = trinketPoolProblem(switched, heroes);
  if (afterIssue) return blocked(afterIssue);
  // 保留旧实例的相对顺序；后续执行器再按R35规定的时点统一洗牌。
  const added = dungeonMonsterPoolThrough(monsterPool, nextLevel)
    .filter((m) => !oldCatalog.some((old) => old.instanceId === m.instanceId))
    .map((m) => m.instanceId);
  return {
    kind: "ready",
    monsterPool: { ...monsterPool, remaining: [...actual, ...added], discarded: [], active: null },
    trinkets: switched,
  };
}
