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
import darkestPool from "../../../../packages/data/normalized/corebox/darkest_monster_pool.json";
const darkestIds = new Set(darkestPool.cards.map((c) => c.combatCardId));

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
  catalog: {
    ...legacyTaskSources.catalog,
    ...preBossQuestBattleData,
    monsters: preBossQuestBattleData.monsters.filter((c) => !darkestIds.has(c.id)),
  },
};

export const taskSources: CoreQuestSources = {
  ...legacyTaskSources,
  catalog: {
    ...preBossTaskSources.catalog,
    monsters: [...preBossQuestBattleData.monsters, ...bossMonsters],
  },
};

/** R-215 之前的固定属性目录。只供旧档完整回放，绝不读取存档自带的属性作规则。 */
export const preHeroStatReviewTaskSources: CoreQuestSources = {
  ...taskSources,
  catalog: {
    ...taskSources.catalog,
    heroStats: taskSources.catalog.heroStats.map((stat) => {
      if (stat.verified_higher_condition_defence?.approval !== "kyries_review_2026-11-10")
        return stat;
      const { verified_higher_condition_defence: reviewed, ...old } = stat;
      if (stat.id === "hero_stat:warrens:leper:p001:front")
        return {
          ...old,
          verified_condition_defence: {
            resistances: ["stun"],
            immunities: [],
            source: "print_front",
            approval: "kyries_review_2026-10-24",
          },
        };
      if (stat.id === "hero_stat:warrens:antiquarian:p002:front")
        return {
          ...old,
          speed: 0,
          verified_higher_condition_defence: {
            ...reviewed,
            resistances: ["blight"],
            approval: "kyries_review_2026-11-08",
          },
        };
      if (stat.name === "ANTIQUARIAN" || stat.name === "FLAGELLANT") return { ...old, speed: 0 };
      if (stat.id === "hero_stat:cove:man-at-arms:p002:front") return { ...old, speed: 1 };
      return old;
    }),
  },
};

const mammothCystCatalogId = "monster_large:p016" as const;
const shufflingHorrorCatalogId = "monster_large:p017" as const;
const templarsCatalogIds = ["monster_large:p014", "monster_large:p015"] as const;

/** 接通 Templars 正式目录前的固定来源。 */
export const preTemplarsTaskSources: CoreQuestSources = {
  ...taskSources,
  catalog: {
    ...taskSources.catalog,
    monsters: taskSources.catalog.monsters.filter(
      (c) => !(templarsCatalogIds as readonly string[]).includes(c.id),
    ),
  },
};

/** 接通 Shuffling Horror 正式目录前的固定来源。 */
export const preShufflingHorrorTaskSources: CoreQuestSources = {
  ...preTemplarsTaskSources,
  catalog: {
    ...preTemplarsTaskSources.catalog,
    monsters: preTemplarsTaskSources.catalog.monsters.filter(
      (c) => c.id !== shufflingHorrorCatalogId,
    ),
  },
};

/** 接通 Mammoth Cyst 正式目录前的固定来源。 */
export const preMammothCystTaskSources: CoreQuestSources = {
  ...preShufflingHorrorTaskSources,
  catalog: {
    ...preShufflingHorrorTaskSources.catalog,
    monsters: preShufflingHorrorTaskSources.catalog.monsters.filter(
      (c) => c.id !== mammothCystCatalogId,
    ),
  },
};

const finalBattleBossCatalogIds = [
  "monster_medium:p105",
  "monster_medium:p106",
  "monster_medium:p109",
  "monster_large:p018",
  "monster_large:p019",
  "monster_large:p020",
] as const;

/** 接通最终战形态正式 bossMonsters 目录前的固定来源。 */
export const preFinalBattleBossCatalogTaskSources: CoreQuestSources = {
  ...preMammothCystTaskSources,
  catalog: {
    ...preMammothCystTaskSources.catalog,
    monsters: preMammothCystTaskSources.catalog.monsters.filter(
      (c) => !(finalBattleBossCatalogIds as readonly string[]).includes(c.id),
    ),
  },
};

/** 接通 Fanatic I 正式目录前的固定来源。 */
export const preFanaticTaskSources: CoreQuestSources = {
  ...preTemplarsTaskSources,
  catalog: {
    ...preTemplarsTaskSources.catalog,
    monsters: preTemplarsTaskSources.catalog.monsters.filter((c) => c.id !== "monster_large:p008"),
  },
};

/** 接通 Collector I 正式目录前的固定来源。 */
export const preCollectorTaskSources: CoreQuestSources = {
  ...preFanaticTaskSources,
  catalog: {
    ...preFanaticTaskSources.catalog,
    monsters: preFanaticTaskSources.catalog.monsters.filter((c) => c.id !== "monster_medium:p092"),
  },
};

/** 接通Prophet I正式目录前的固定来源。 */
export const preProphetTaskSources: CoreQuestSources = {
  ...preCollectorTaskSources,
  catalog: {
    ...preCollectorTaskSources.catalog,
    monsters: preCollectorTaskSources.catalog.monsters.filter((c) => c.id !== "monster_large:p005"),
  },
};

/** 接通Necromancer I真实部署前的固定目录，用于严格验证既有存档。 */
export const preNecromancerTaskSources: CoreQuestSources = {
  ...taskSources,
  catalog: {
    ...preProphetTaskSources.catalog,
    monsters: preProphetTaskSources.catalog.monsters.filter((c) => c.id !== "monster_medium:p089"),
  },
};

export const preDarkestTaskSources: CoreQuestSources = {
  ...taskSources,
  catalog: {
    ...taskSources.catalog,
    monsters: preNecromancerTaskSources.catalog.monsters.filter((c) => !darkestIds.has(c.id)),
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
    monsters: preDarkestTaskSources.catalog.monsters,
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
