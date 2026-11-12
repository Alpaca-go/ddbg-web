import {
  cardContentPack,
  normalizeContentPacks,
  packEnabled,
  type ContentPackId,
} from "../../data/src/content-packs";
import type { CoreQuestSources } from "./dungeon-quest-entry";

export { CONTENT_PACKS, CONTENT_PACK_IDS, packEnabled } from "../../data/src/content-packs";
export type { ContentPackId } from "../../data/src/content-packs";

/** 在创建牌堆之前过滤，升级、替补、技能购买复用同一份战役目录。 */
export function sourcesForContentPacks(
  sources: CoreQuestSources,
  packs: readonly ContentPackId[],
): CoreQuestSources {
  const selected = normalizeContentPacks(packs);
  const allowed = (card: { readonly id: string; readonly hero?: string | null }) =>
    packEnabled(selected, cardContentPack(card));
  const catalog = sources.catalog;
  return {
    catalog: {
      ...catalog,
      // 英雄及全部等级技能跨包共享，保持原顺序。
      heroStats: catalog.heroStats,
      skills: catalog.skills,
      monsters: catalog.monsters.filter(allowed),
      ...(catalog.conditions
        ? {
            conditions: {
              ...catalog.conditions,
              diseases: catalog.conditions.diseases.filter(allowed),
              quirks: catalog.conditions.quirks.filter(allowed),
            },
          }
        : {}),
      ...(catalog.trinkets
        ? { trinkets: { ...catalog.trinkets, cards: catalog.trinkets.cards.filter(allowed) } }
        : {}),
    },
    ...(selected.includes("weald") && sources.weald ? { weald: sources.weald } : {}),
    resolveCards: sources.resolveCards.filter(allowed),
    curios: sources.curios.filter(allowed),
    rooms: sources.rooms.filter(allowed),
    monsters: sources.monsters.filter(allowed),
  };
}
