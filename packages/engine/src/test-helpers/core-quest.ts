import stats from "../../../data/normalized/corebox/hero_stat.json";
import skills from "../../../data/normalized/corebox/hero_skill.json";
import medium from "../../../data/normalized/corebox/monster_medium.json";
import large from "../../../data/normalized/corebox/monster_large.json";
import diseases from "../../../data/normalized/corebox/disease.json";
import quirks from "../../../data/normalized/corebox/quirk.json";
import resolves from "../../../data/normalized/corebox/virtue_affliction.json";
import trinkets from "../../../data/normalized/corebox/trinket.json";
import rooms from "../../../data/normalized/corebox/room.json";
import monsters from "../../../data/normalized/corebox/monster_pool.json";
import curios from "../../../data/normalized/corebox/curio.json";
import { normalizedHeroStatFileSchema } from "../../../data/src/normalize/hero-stat";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedMonsterLargeFileSchema,
  normalizedQuirkFileSchema,
  normalizedTrinketFileSchema,
  normalizedVirtueAfflictionFileSchema,
} from "../../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../../data/src/disease";
import { roomFileSchema } from "../../../data/src/room";
import { monsterPoolFileSchema } from "../../../data/src/monster-pool";
import { curioFileSchema } from "../../../data/src/curio";
import { createConditionPool } from "../conditions";
import { createTrinketPool } from "../trinket-acquisition";
import type { CoreQuestSources, QuestParty } from "../dungeon-quest-entry";

/** 真实完整规范化来源；不提供可注入代币／伤害／金币／牌序的接口。 */
export const coreQuestSources = JSON.parse(
  JSON.stringify({
    catalog: {
      heroStats: normalizedHeroStatFileSchema.parse(stats).cards,
      skills: normalizedHeroSkillFileSchema.parse(skills).cards,
      monsters: [
        ...normalizedMonsterMediumFileSchema.parse(medium).cards,
        ...normalizedMonsterLargeFileSchema.parse(large).cards,
      ]
        .filter((c) => "skills" in c)
        .map((c) => ({
          ...c,
          dodge: c.header_unlabeled_numbers.find(
            (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
          )?.numeric,
        })),
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseases).cards,
        normalizedQuirkFileSchema.parse(quirks).cards,
      ),
      trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 1),
    },
    resolveCards: normalizedVirtueAfflictionFileSchema.parse(resolves).cards,
    curios: curioFileSchema.parse(curios).cards,
    rooms: roomFileSchema.parse(rooms).cards,
    monsters: monsterPoolFileSchema.parse(monsters).cards,
  }),
) as CoreQuestSources;
export const coreParty: QuestParty = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map(
  (name, index) => ({
    heroStatId: coreQuestSources.catalog.heroStats.find((s) => s.level === 1 && s.name === name)!
      .id,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
    skillIds: coreQuestSources.catalog.skills
      .filter((s) => s.hero === name && s.level === 1)
      .slice(0, 3)
      .map((s) => s.id),
  }),
);
