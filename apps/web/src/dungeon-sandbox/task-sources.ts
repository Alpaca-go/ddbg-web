import { createTrinketPool } from "@ddbg/engine";
import type { CoreQuestSources } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { battleData as questBattleData } from "virtual:quest-battle-data";
import { battleData as previousQuestBattleData } from "virtual:quest-battle-data-v1";
import { battleData as sixHeroQuestBattleData } from "virtual:quest-battle-data-v2";
import rawRooms from "../../../../packages/data/normalized/corebox/room.json";
import { roomFileSchema } from "../../../../packages/data/src/room";
import rawMonsterPool from "../../../../packages/data/normalized/corebox/monster_pool.json";
import { monsterPoolFileSchema } from "../../../../packages/data/src/monster-pool";
import rawTrinkets from "../../../../packages/data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../../packages/data/src/normalize/schema";
import { curios } from "./dungeon-data";

export const legacyTaskSources: CoreQuestSources = {
  catalog: {
    ...battleData,
    trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(rawTrinkets).cards, 1),
  },
  resolveCards: battleData.resolveCards,
  curios: curios,
  rooms: roomFileSchema.parse(rawRooms).cards,
  monsters: monsterPoolFileSchema.parse(rawMonsterPool).cards,
};

export const taskSources: CoreQuestSources = {
  ...legacyTaskSources,
  catalog: { ...legacyTaskSources.catalog, ...questBattleData },
};

export const previousTaskSources: CoreQuestSources = {
  ...legacyTaskSources,
  catalog: { ...legacyTaskSources.catalog, ...previousQuestBattleData },
};

/** 六英雄正式目录（赏金猎人+瘟疫医生）；R-095 扩八英雄后作旧档迁移可信来源。 */
export const sixHeroTaskSources: CoreQuestSources = {
  ...legacyTaskSources,
  catalog: { ...legacyTaskSources.catalog, ...sixHeroQuestBattleData },
};
