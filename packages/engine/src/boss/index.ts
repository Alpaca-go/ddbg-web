export type {
  BossBattleRules,
  BossCombatEntryRefs,
  BossFaceTheThreatContext,
  BossHookName,
  BossHookOk,
  BossHookStubResult,
  BossMonsterTurnContext,
  BossScriptDefinition,
  BossScriptHooks,
  BossScriptId,
  BossSlotPlacementContext,
  BossSummonContext,
  BossSummonOk,
  BossSummonPlacement,
  BossSummonResult,
  BossThreatPassiveContext,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveDungeonResult,
  BossThreatPassiveHamletOk,
  BossThreatPassiveHamletResult,
} from "./types";
export { readBossCombatEntry } from "./combat-entry";
export {
  cardIdsPermanentlyRemovedAfterBattle,
  hamletBuildingsBlockedByBossThreat,
} from "./threat-passive";
export {
  ensureCoreBossScriptsRegistered,
  ensureNecromancerIBossScriptRegistered,
  NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
  necromancerIBossScript,
} from "./necromancer-i";
export {
  clearBossScriptsForTest,
  getBossScript,
  listBossScripts,
  registerBossScript,
} from "./registry";
export { DEFAULT_BOSS_BATTLE_RULES, encounterRoundRetreatLimit } from "./rules";
export { defaultMonsterTurnActionCount, runBossHook } from "./hooks";
export {
  ensureFixtureBossScriptRegistered,
  FIXTURE_BOSS_SCRIPT_ID,
  fixtureBossSkeletonScript,
} from "./fixture-skeleton";
export {
  bossQuestScriptId,
  FACE_THE_THREAT_QUEST_ID,
  isBossQuestId,
  resolveBossScriptIdForQuest,
} from "./quest-bridge";
