import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
import { ensureCampaignBossScriptsRegistered } from "../expansions/register";
import { ensureHagIBossScriptRegistered } from "../expansions/weald/boss/hag-i";
import { ensurePounderIBossScriptRegistered } from "../expansions/weald/boss/pounder-i";
import { ensureShriekerIBossScriptRegistered } from "../expansions/weald/boss/shrieker-i";
import { getBossScript } from "../boss/registry";
import { wealdBossActEntry } from "../expansions/weald/boss/weald-boss-act-entry";
import { WEALD_BOSS_IDENTITIES, type WealdBossIdentity } from "../expansions/weald/catalog";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { createWealdHigherMonsterPoolState } from "../expansions/weald/higher-monster-pool";
import { createWealdLevelOneMonsterPoolState } from "../expansions/weald/monster-pool";
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
