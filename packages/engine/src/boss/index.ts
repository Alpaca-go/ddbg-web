export type {
  BossBattleRules,
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
  BossThreatPassiveContext,
} from "./types";
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
