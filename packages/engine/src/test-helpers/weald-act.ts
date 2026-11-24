import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
import { ensureCampaignBossScriptsRegistered } from "../registry";
import { ensureHagIBossScriptRegistered } from "../weald/bosses/hag-i";
import { ensurePounderIBossScriptRegistered } from "../weald/bosses/pounder-i";
import { ensureShriekerIBossScriptRegistered } from "../weald/bosses/shrieker-i";
import { getBossScript } from "../core/bosses/registry";
import { wealdBossActEntry } from "../weald/bosses/weald-boss-act-entry";
import type { RuinsBossIdentity } from "../core/bosses/threat-description-catalog";
import { WEALD_BOSS_IDENTITIES, type WealdBossIdentity } from "../weald/catalog";
import { ruinsActReadyFixture } from "./ruins-act";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { createWealdHigherMonsterPoolState } from "../weald/higher-monster-pool";
import { createWealdLevelOneMonsterPoolState } from "../weald/monster-pool";
import { dungeonMonsterPoolThrough } from "../monster-pool-runtime";
import trinketSource from "../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../data/src/normalize/schema";
import { switchTrinketDungeonLevel } from "../trinket-acquisition";

const trinketCatalog = normalizedTrinketFileSchema.parse(trinketSource).cards;

const packs = ["core", "weald"] as const;
const poolInput = () => ({
  core: coreQuestSources.monsters,
  medium,
  large,
  contentPacks: packs,
});

export const wealdActInitial = createCoreDungeonQuest(
  3,
  "quest:p019",
  "standard",
  coreParty,
  coreQuestSources,
  true,
  null,
  packs,
);

ensureHagIBossScriptRegistered();
ensurePounderIBossScriptRegistered();
ensureShriekerIBossScriptRegistered();
ensureCampaignBossScriptsRegistered(packs);

/** 明示回村边界机制夹具；不冒充自然 Boss 链或步骤 8 验收。 */
export function wealdActReadyFixture(level: 1 | 2, boss: WealdBossIdentity): GameState {
  const { activeBossThreatScriptId: _active, ...d } = wealdActInitial.dungeon!;
  void _active;
  const entry = wealdBossActEntry(boss, level);
  if (!entry) throw new Error(`缺少 ${boss} CL${level} 升幕夹具条目`);
  const production = {
    locationBossThreats: true as const,
    wealdHigherBosses: true as const,
    bossLocationSources: true as const,
    bossExpeditionRegion: "weald" as const,
    pounderBossBattles: true as const,
    shriekerBossBattles: true as const,
    contentPacks: packs,
    ...(level >= 2 ? { wealdHigherQuestOffers: "tasks-v1" as const } : {}),
  };
  const pool =
    level === 1
      ? {
          ...createWealdLevelOneMonsterPoolState(poolInput()),
          remaining: null,
          discarded: [],
        }
      : {
          ...createWealdHigherMonsterPoolState({ ...poolInput(), level }),
          remaining: null,
          discarded: [],
        };
  const instances = dungeonMonsterPoolThrough(pool, level).map((m) => m.instanceId);
  const trinkets =
    level === 1
      ? d.trinkets!
      : (() => {
          const switched = switchTrinketDungeonLevel(d.trinkets!, trinketCatalog, level);
          if ("reason" in switched) throw new Error(switched.reason);
          return switched;
        })();
  return {
    ...wealdActInitial,
    dungeon: {
      ...d,
      ...production,
      phase: "inHamlet",
      campaignLevel: level,
      bossQuestVictory: true,
      pending: null,
      trinkets,
      monsterPool: { ...pool, remaining: instances, discarded: [] },
      explorationSetup: { dungeonLevel: level, light: 5, provisions: [] },
      discardedQuests:
        level === 1
          ? ["quest:weald:p001", "quest:weald:p002", "quest:weald:p003"]
          : ["quest:weald:p006", "quest:weald:p007", "quest:weald:p008"],
      completedRegularQuests:
        level === 1
          ? [
              { questId: "quest:weald:p001", campaignLevel: 1 },
              { questId: "quest:weald:p002", campaignLevel: 1 },
            ]
          : [
              { questId: "quest:weald:p006", campaignLevel: 2 },
              { questId: "quest:weald:p007", campaignLevel: 2 },
            ],
      defeatedWealdBossIdentities:
        level === 1 ? [boss] : [WEALD_BOSS_IDENTITIES.find((id) => id !== boss)!, boss],
      defeatedRuinsBossIdentities: [],
      bossCombatThreatCeased: entry.script,
      imminentThreatDescriptionCardId: entry.description,
      faceTheThreatEmbarkPlan: {
        questId: "quest:p019",
        resolvedScriptId: entry.script,
        combatEntry: { ...getBossScript(entry.script)!.combatEntry! },
        rulesRef: ["R35"],
        layoutWiringHold: "明示几何未审夹具",
      },
      questSummary: {
        questId: "quest:p019",
        name: "Face the Threat!",
        clearedRoomIds: [],
        xpPerHero: 3,
        stagecoachXp: 3,
        awarded: true,
      },
      hamletReturn: { phase: "complete" } as NonNullable<DungeonState["hamletReturn"]>,
    },
  };
}

/** 混合地点 II→III：一名遗迹 Boss + 一名 Weald Boss，仍走 Weald 生产升幕路径。 */
export function wealdMixedActReadyFixture(
  ruinsBoss: RuinsBossIdentity,
  wealdBoss: WealdBossIdentity,
): GameState {
  const wealdSide = wealdActReadyFixture(2, wealdBoss);
  const wealdEntry = wealdBossActEntry(wealdBoss, 2)!;
  const ruinsPool = ruinsActReadyFixture(2, ruinsBoss).dungeon!.monsterPool!;
  return {
    ...wealdSide,
    dungeon: {
      ...wealdSide.dungeon!,
      monsterPool: {
        ...ruinsPool,
        location: "ruins" as const,
        remaining: ruinsPool.remaining,
        discarded: ruinsPool.discarded,
      },
      defeatedRuinsBossIdentities: [ruinsBoss],
      defeatedWealdBossIdentities: [wealdBoss],
      bossCombatThreatCeased: wealdEntry.script,
      imminentThreatDescriptionCardId: wealdEntry.description,
      faceTheThreatEmbarkPlan: {
        questId: "quest:p019",
        resolvedScriptId: wealdEntry.script,
        combatEntry: { ...getBossScript(wealdEntry.script)!.combatEntry! },
        rulesRef: ["R35", "W3"],
        layoutWiringHold: "混合地点夹具",
      },
      completedRegularQuests: [
        { questId: "quest:p006", campaignLevel: 2 },
        { questId: "quest:weald:p006", campaignLevel: 2 },
      ],
      discardedQuests: [
        "quest:p006",
        "quest:p007",
        "quest:weald:p006",
        "quest:weald:p007",
        "quest:weald:p008",
      ],
      questSummary: {
        questId: "quest:p019",
        name: "Face the Threat!",
        clearedRoomIds: [],
        xpPerHero: 3,
        stagecoachXp: 3,
        awarded: true,
      },
    },
  };
}
