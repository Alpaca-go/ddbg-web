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

const { bossMonsters = [], ...preBossQuestBattleData } = questBattleData;

/** 加入 Boss 目录前的可信正式来源；只用于严格旧档验证。 */
export const preBossTaskSources: CoreQuestSources = {
  ...legacyTaskSources,
  catalog: { ...legacyTaskSources.catalog, ...preBossQuestBattleData },
};

export const taskSources: CoreQuestSources = {
  ...legacyTaskSources,
  catalog: {
    ...preBossTaskSources.catalog,
    monsters: [...preBossQuestBattleData.monsters, ...bossMonsters],
  },
};

/** #416's fixed 141-card higher catalog, for strict validation before upgrading catalog fields. */
const abominationHigherAdded = new Set(
  [218, 219, 221, 222, 224, 225, 227, 228, 230, 231].map((p) => `hero_skill:p${p}`),
);
export const preAbominationTaskSources: CoreQuestSources = {
  ...taskSources,
  catalog: {
    ...taskSources.catalog,
    skills: taskSources.catalog.skills.filter((c) => !abominationHigherAdded.has(c.id)),
  },
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
