import warrensMedium from "../../../../data/normalized/extension/warrens/monster_medium.json";
import warrensLarge from "../../../../data/normalized/extension/warrens/monster_large.json";
import type { CoreQuestSources } from "../../shared/dungeon/dungeon-quest-entry";
import { buildWarrensMonsterCatalogViews } from "./warrens-monster-catalog";

const warrensCatalogViews = buildWarrensMonsterCatalogViews(warrensMedium, warrensLarge);

export const warrensMonsterQuestSources = {
  medium: warrensMedium,
  large: warrensLarge,
} as const;

/** 在可信来源上追加 Warrens 战斗目录；包过滤仍由 sourcesForContentPacks 处理。 */
export function withWarrensMonsterSources(sources: CoreQuestSources): CoreQuestSources {
  return {
    ...sources,
    warrens: warrensMonsterQuestSources,
    catalog: {
      ...sources.catalog,
      monsters: [...sources.catalog.monsters, ...warrensCatalogViews],
    },
  };
}
