import { switchWealdActPools } from "../../src/shared/hamlet/act-transition-pools";
import type { GameState } from "../../src/shared/core/command";
import type { DungeonState } from "../../src/shared/dungeon/dungeon";
import { WEALD_BOSS_IDENTITIES, type WealdBossIdentity } from "../../src/weald/catalog";
import { wealdBossActEntry } from "../../src/weald/bosses/weald-boss-act-entry";
import { getBossScript } from "../../src/core/bosses/registry";
import { wealdActInitial, wealdActReadyFixture } from "./weald-act";

/** Act III 纯 Weald 生产路径：三名 Weald Boss 已击败，不冒称自然日志。 */
export function wealdActThreeCompleteFixture(
  boss: WealdBossIdentity = "shrieker",
  seed = wealdActInitial.seed,
): GameState {
  const start = wealdActReadyFixture(1, WEALD_BOSS_IDENTITIES[0]!);
  const heroes = start.dungeon!.heroes;
  const packs = start.dungeon!.contentPacks!;
  const level2 = switchWealdActPools(
    1,
    start.dungeon!.monsterPool!,
    start.dungeon!.trinkets!,
    heroes,
    packs,
  );
  if (level2.kind !== "ready") throw new Error(level2.reason);
  const level3 = switchWealdActPools(2, level2.monsterPool, level2.trinkets, heroes, packs);
  if (level3.kind !== "ready") throw new Error(level3.reason);
  const base = wealdActReadyFixture(2, boss);
  const entry = wealdBossActEntry(boss, 3)!;
  const defeated: WealdBossIdentity[] = [
    ...WEALD_BOSS_IDENTITIES.filter((id) => id !== boss).slice(0, 2),
    boss,
  ];
  return {
    ...base,
    seed,
    dungeon: {
      ...base.dungeon!,
      phase: "inHamlet",
      campaignLevel: 3,
      explorationSetup: { dungeonLevel: 3, light: 5, provisions: [] },
      monsterPool: level3.monsterPool,
      trinkets: level3.trinkets,
      defeatedWealdBossIdentities: defeated,
      defeatedRuinsBossIdentities: [],
      bossCombatThreatCeased: entry.script,
      imminentThreatDescriptionCardId: entry.description,
      faceTheThreatEmbarkPlan: {
        questId: "quest:p019",
        resolvedScriptId: entry.script,
        combatEntry: { ...getBossScript(entry.script)!.combatEntry! },
        rulesRef: ["R35", "R-191"],
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
      hamlet: {
        deck: ["hamlet_event:p001"],
        permanentlyRemoved: [],
        active: null,
        last: "hamlet_event:p001",
        phase: "preparationComplete",
        preparationDays: 4,
        remainingDays: 0,
        day: 1,
        noCaretaker: false,
        extraBlock: false,
        caretaker: null,
        blockedBuildings: [],
        heroOrder: [],
      },
      pending: null,
      bossQuestVictory: true,
    },
  };
}
