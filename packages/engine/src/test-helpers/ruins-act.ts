import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { RUINS_COMBAT_LEVELS } from "../boss/ruins-combat-levels";
import { ensureCoreBossScriptsRegistered } from "../boss/ensure-core-boss-scripts";
import { getBossScript } from "../boss/registry";
import { RUINS_BOSS_IDENTITIES, type RuinsBossIdentity } from "../boss/threat-description-catalog";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";

export const ruinsActInitial = createCoreDungeonQuest(
  1,
  "quest:p019",
  "radiant",
  coreParty,
  coreQuestSources,
);
ensureCoreBossScriptsRegistered();
/** 明示回村边界机制夹具，不冒称自然Boss部署或正式战役日志。 */
export function ruinsActReadyFixture(level: 1 | 2, boss: RuinsBossIdentity): GameState {
  const { activeBossThreatScriptId: _active, ...d } = ruinsActInitial.dungeon!;
  void _active;
  const entry = RUINS_COMBAT_LEVELS[boss][level - 1]!;
  return {
    ...ruinsActInitial,
    dungeon: {
      ...d,
      phase: "inHamlet",
      campaignLevel: level,
      bossQuestVictory: true,
      pending: null,
      explorationSetup: { dungeonLevel: level, light: 5, provisions: [] },
      discardedQuests:
        level === 1
          ? ["quest:p001", "quest:p002", "quest:p003"]
          : ["quest:p006", "quest:p007", "quest:p008"],
      defeatedRuinsBossIdentities:
        level === 1 ? [boss] : [RUINS_BOSS_IDENTITIES.find((id) => id !== boss)!, boss],
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
