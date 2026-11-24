import monsterSource from "../../data/normalized/corebox/monster_pool.json";
import trinketSource from "../../data/normalized/corebox/trinket.json";
import { basicQuests, questsForCampaignLevel } from "../../data/src/basic-quests";
import { monsterPoolFileSchema, ruinsMonsterPool } from "../../data/src/monster-pool";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import {
  RUINS_BOSS_IDENTITIES,
  imminentThreatPoolForCampaign,
  type RuinsBossIdentity,
} from "./core/bosses/threat-description-catalog";
import { wealdThreatPool } from "./weald/bosses/threat-pool";
import { WEALD_BOSS_IDENTITIES, type WealdBossIdentity } from "./weald/catalog";
import { questIdsForLocationDeck } from "./hamlet-location-quest-draw";
import { buildWealdHigherMonsterPool } from "./weald/higher-monster-pool";

const monsters = monsterPoolFileSchema.parse(monsterSource).cards;
const trinkets = normalizedTrinketFileSchema.parse(trinketSource).cards;

/** R35 / R-037：仅计算池切换数据，不宣告Boss胜利、不抽牌或写入状态。 */
export function buildRuinsActTransitionPlan(
  fromLevel: 1 | 2,
  defeatedBosses: readonly RuinsBossIdentity[],
  removedQuestIds: readonly string[],
) {
  if (
    ![1, 2].includes(fromLevel) ||
    defeatedBosses.length !== fromLevel ||
    new Set(defeatedBosses).size !== defeatedBosses.length ||
    defeatedBosses.some((id) => !RUINS_BOSS_IDENTITIES.includes(id))
  )
    throw new Error("升幕计划须有对应数量的不重复Ruins Boss击败记录（R35）");
  if (
    new Set(removedQuestIds).size !== removedQuestIds.length ||
    removedQuestIds.some(
      (id) =>
        !basicQuests.some((q) => q.id === id && q.level <= fromLevel && q.id !== "quest:p019"),
    )
  )
    throw new Error("任务移出记录须为当前或先前等级的普通任务（R-037）");
  const toLevel = (fromLevel + 1) as 2 | 3;
  const retiredQuestIds = [
    ...new Set([
      ...removedQuestIds,
      ...basicQuests
        .filter(
          (q) => q.level <= fromLevel && q.id !== "quest:p019" && q.expeditionRegion !== "weald",
        )
        .map((q) => q.id),
    ]),
  ].sort();
  return {
    fromLevel,
    toLevel,
    imminentThreatDescriptionCardIds: [...imminentThreatPoolForCampaign(toLevel, defeatedBosses)],
    retiredQuestIds,
    nextOrdinaryQuestIds: questsForCampaignLevel(toLevel).map((q) => q.id),
    // 不从目录重建旧牌堆：已被威胁永久移出的怪物不能复活。
    retainExistingMonsterInstances: true as const,
    addedMonsterInstances: ruinsMonsterPool(monsters, toLevel).map((m) => ({
      instanceId: m.instanceId,
      cardId: m.cardId,
    })),
    // 这是可用卡目录，不是未持有卡组成的实际抽牌堆。
    eligibleDungeonTrinketCardIds: trinkets.filter((c) => c.level === toLevel).map((c) => c.id),
    nomadOnlyTrinketLevels: Array.from({ length: fromLevel }, (_, i) => i + 1),
    retainHeldTrinkets: true as const,
  };
}

const wealdOrdinaryQuestId = (id: string) =>
  basicQuests.some(
    (q) =>
      q.id === id &&
      q.expeditionRegion === "weald" &&
      !("bossQuest" in q && q.bossQuest) &&
      id !== "quest:p019",
  );

/** R35 / R-037 / W3：Weald 地点战役升幕计划（生产 `tasks-v1` 普通任务栈）；遗迹与 Weald 击败合计计幕。 */
export function buildWealdActTransitionPlan(
  fromLevel: 1 | 2,
  defeatedRuinsBosses: readonly RuinsBossIdentity[],
  defeatedWealdBosses: readonly WealdBossIdentity[],
  removedQuestIds: readonly string[],
) {
  if (
    ![1, 2].includes(fromLevel) ||
    defeatedRuinsBosses.length + defeatedWealdBosses.length !== fromLevel ||
    new Set(defeatedRuinsBosses).size !== defeatedRuinsBosses.length ||
    defeatedRuinsBosses.some((id) => !RUINS_BOSS_IDENTITIES.includes(id)) ||
    new Set(defeatedWealdBosses).size !== defeatedWealdBosses.length ||
    defeatedWealdBosses.some((id) => !WEALD_BOSS_IDENTITIES.includes(id))
  )
    throw new Error(
      "升幕计划须有对应幕次的不重复战役 Boss 击败记录（遗迹与 Weald 合计）（W3／R35）",
    );
  if (
    new Set(removedQuestIds).size !== removedQuestIds.length ||
    removedQuestIds.some((id) => {
      const quest = basicQuests.find((q) => q.id === id);
      if (!quest || quest.id === "quest:p019") return true;
      if (quest.level > fromLevel) return true;
      if ("bossQuest" in quest && quest.bossQuest) return true;
      if (quest.expeditionRegion === "weald") return !wealdOrdinaryQuestId(id);
      return quest.expeditionRegion !== undefined && quest.expeditionRegion !== "ruins";
    })
  )
    throw new Error("任务移出记录须为当前或先前等级的普通任务（遗迹或 Weald）（R-037）");
  const toLevel = (fromLevel + 1) as 2 | 3;
  const higherTasks = "tasks-v1" as const;
  const retiredQuestIds = [
    ...new Set([
      ...removedQuestIds,
      ...([1, 2, 3] as const)
        .filter((level) => level <= fromLevel)
        .flatMap((level) =>
          questIdsForLocationDeck("weald", level, ["core", "weald"], higherTasks),
        ),
      ...basicQuests
        .filter(
          (q) => q.level <= fromLevel && q.id !== "quest:p019" && q.expeditionRegion !== "weald",
        )
        .map((q) => q.id),
    ]),
  ].sort();
  return {
    fromLevel,
    toLevel,
    imminentThreatDescriptionCardIds: [
      ...wealdThreatPool(
        {
          contentPacks: ["core", "weald"],
          wealdHigherBosses: true,
          defeatedRuinsBossIdentities: defeatedRuinsBosses,
          defeatedWealdBossIdentities: defeatedWealdBosses,
        },
        toLevel,
      ),
    ],
    retiredQuestIds,
    nextOrdinaryQuestIds: [
      ...questIdsForLocationDeck("weald", toLevel, ["core", "weald"], higherTasks),
    ],
    retainExistingMonsterInstances: true as const,
    addedMonsterInstances: buildWealdHigherMonsterPool({
      contentPacks: ["core", "weald"],
      core: monsters,
      level: toLevel,
    }).map((m) => ({ instanceId: m.instanceId, cardId: m.cardId })),
    eligibleDungeonTrinketCardIds: trinkets.filter((c) => c.level === toLevel).map((c) => c.id),
    nomadOnlyTrinketLevels: Array.from({ length: fromLevel }, (_, i) => i + 1),
    retainHeldTrinkets: true as const,
  };
}
