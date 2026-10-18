import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import { basicQuests } from "../../data/src/basic-quests";
import type { BasicQuestId } from "../../data/src/basic-quests";
import type { CurioCard } from "../../data/src/curio";
import type { RoomCard } from "../../data/src/room";
import type { MonsterPoolCard } from "../../data/src/monster-pool";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonBattleCatalog, DungeonState } from "./dungeon";
import type { ResolveCard } from "./pressure";
import type { SkillStance } from "./hero-skill";
import { createConditionPool } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";
import { isFormalHeroName } from "./formal-heroes";

export type CoreQuestSources = {
  readonly catalog: DungeonBattleCatalog;
  readonly resolveCards: readonly ResolveCard[];
  readonly curios: readonly CurioCard[];
  readonly rooms: readonly RoomCard[];
  readonly monsters: readonly MonsterPoolCard[];
};
export type QuestParty = readonly {
  readonly heroStatId: string;
  readonly stance: SkillStance;
  readonly skillIds: readonly string[];
}[];

/**
 * R12–17、R-038/048/065：已批准p1的单任务入口，无状态／代币注入，不代替战役选任务。
 * 开局四人须来自正式八英雄目录（与替补白名单同一集合）；转录通过即可装备，
 * GR/Occ 可编入；GR 战斗技能与 Pilfer 抽取已接（R-096、R-098）；Occ I 级七技能与 Dark Ritual I–III 已接（R-097）。
 */
export function createCoreDungeonQuest(
  seed: number,
  questId: BasicQuestId,
  mode: DungeonState["mode"],
  party: QuestParty,
  sources: CoreQuestSources,
) {
  const quest = basicQuests.find((quest) => quest.id === questId);
  if (
    !quest ||
    quest.level !== 1 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !["standard", "radiant"].includes(mode)
  )
    throw new Error("请选择已接通的I级任务、模式及32位非负整数种子");
  if (
    party.length !== 4 ||
    new Set(party.map((hero) => hero.stance)).size !== 4 ||
    party.some((hero) => !["aggressive", "defensive", "ranged", "support"].includes(hero.stance))
  )
    throw new Error("需要四名正式目录英雄且各占一个姿态");
  const selectedNames: string[] = [];
  const heroes = party.map((selected, index) => {
    const stat = sources.catalog.heroStats.find(
      (stat) => stat.id === selected.heroStatId && stat.level === 1 && stat.attributesVerified,
    );
    if (!stat || !isFormalHeroName(stat.name) || !Number.isSafeInteger(stat.life) || stat.life < 1)
      throw new Error("需要已核实的正式目录I级英雄属性");
    selectedNames.push(stat.name);
    if (
      selected.skillIds.length !== 3 ||
      new Set(selected.skillIds).size !== 3 ||
      selected.skillIds.some(
        (id) =>
          !sources.catalog.skills.some(
            (skill) =>
              skill.id === id &&
              skill.hero === stat.name &&
              skill.level === 1 &&
              !skill.verification.unverified,
          ),
      )
    )
      throw new Error("每名英雄须装备三个不同的已核实I级技能");
    return {
      id: `hero-${index}`,
      heroStatId: stat.id,
      level: 1,
      life: stat.life,
      attributesVerified: true,
      wounds: 0,
      stress: 0,
      stance: selected.stance,
      skillIds: [...selected.skillIds],
    };
  });
  if (
    new Set(selectedNames).size !== 4 ||
    !sources.catalog.conditions ||
    !sources.catalog.trinkets ||
    sources.catalog.trinkets.level !== 1 ||
    sources.resolveCards.length !== 10 ||
    new Set(sources.resolveCards.map((card) => card.id)).size !== 10
  )
    throw new Error("需要四名不同正式目录英雄及完整条件、I级饰品与十张意志卡");
  const conditions = createConditionPool(
    sources.catalog.conditions.diseases,
    sources.catalog.conditions.quirks,
  );
  const trinkets = {
    ...sources.catalog.trinkets,
    deck: null,
    discard: [],
    held: [],
    incoming: null,
  };
  const problem = trinketPoolProblem(trinkets, heroes);
  if (problem) throw new Error(problem);
  return createDungeonSandbox(
    seed,
    layout,
    quest.distribution,
    mode,
    "S",
    heroes,
    sources.resolveCards,
    { dungeonLevel: 1, light: 5, provisions: [] },
    sources.curios,
    sources.rooms,
    sources.monsters,
    { ...sources.catalog, conditions, trinkets },
    true,
  );
}
