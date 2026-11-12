import { curioCatalogSchema } from "../../data/src/curio";
import { monsterPoolCatalogSchema } from "../../data/src/monster-pool";
import type { CoreQuestSources } from "./dungeon-quest-entry";

/** 核心来源重建不加载扩展战斗模块，保留旧入口的模块初始化顺序。 */
export function rebuildCoreQuestDecks(sources: CoreQuestSources) {
  return {
    catalog: sources.catalog,
    curios: curioCatalogSchema.parse(sources.curios),
    monsterPool: {
      cards: monsterPoolCatalogSchema.parse(sources.monsters),
      remaining: null,
      discarded: [],
      active: null,
    },
  };
}
