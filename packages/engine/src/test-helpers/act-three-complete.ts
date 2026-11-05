import { RUINS_COMBAT_LEVELS } from "../boss/ruins-combat-levels";
import { RUINS_BOSS_IDENTITIES, type RuinsBossIdentity } from "../boss/threat-description-catalog";
import { getBossScript } from "../boss/registry";
import { switchRuinsActPools } from "../act-transition-pools";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { ruinsActInitial, ruinsActReadyFixture } from "./ruins-act";

/**
 * 机制夹具（**不是**自然战役日志）：直接声明 Act III Boss 已击败、3 XP 已发、回村完成，
 * 且击败第 3 个 Boss 后的村庄阶段已结束。用于入口/出征切片，不冒称已自然打通 III 幕。
 */
export function actThreeCompleteFixture(
  boss: RuinsBossIdentity = "necromancer",
  seed = ruinsActInitial.seed,
): GameState {
  const base = ruinsActReadyFixture(2, boss);
  const heroes = base.dungeon!.heroes;
  const level2 = switchRuinsActPools(
    1,
    base.dungeon!.monsterPool!,
    base.dungeon!.trinkets!,
    heroes,
  );
  if (level2.kind !== "ready") throw new Error(level2.reason);
  const level3 = switchRuinsActPools(2, level2.monsterPool, level2.trinkets, heroes);
  if (level3.kind !== "ready") throw new Error(level3.reason);
  const entry = RUINS_COMBAT_LEVELS[boss][2]!;
  const defeated: RuinsBossIdentity[] = [
    ...RUINS_BOSS_IDENTITIES.filter((id) => id !== boss).slice(0, 2),
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
      defeatedRuinsBossIdentities: defeated,
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
      ...(base.dungeon!.discardedQuests ? { discardedQuests: base.dungeon!.discardedQuests } : {}),
    },
  };
}
