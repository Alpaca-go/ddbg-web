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
  beastMonsterDamageBonusFromBossThreat,
  sanitariumHealLifeDeltaFromBossThreat,
  stressOnDungeonEntryPerHeroFromBossThreat,
  stressOnHeroProvisionUseFromBossThreat,
  tavernStressRecoveryDeltaFromBossThreat,
} from "./threat-passive";
export {
  applyBossThreatAfterBattleToPool,
  bossThreatClearHoldReason,
  bossThreatHamletBlockedBuildings,
  clearedBossThreatScriptIdAfterVictory,
  mergeHamletCaretakerBlockedWithBossThreat,
  readActiveBossThreatScriptId,
  syncHamletBlockedBuildingsForBossThreat,
} from "./threat-campaign";
export { setActiveBossThreat } from "./set-active-boss-threat";
export type { SetActiveBossThreatCommand } from "./set-active-boss-threat";
export {
  drawImminentThreatAfterActAdvance,
  establishImminentThreat,
  recordRuinsBossDefeatOnThreatCleared,
} from "./establish-imminent-threat";
export type {
  DrawImminentThreatAfterActAdvanceCommand,
  EstablishImminentThreatCommand,
  ImminentThreatCommand,
} from "./establish-imminent-threat";
export {
  RUINS_BOSS_DESCRIPTION_CARD_ID,
  RUINS_BOSS_IDENTITIES,
  imminentThreatPoolForCampaign,
  resolveScriptIdForDescriptionCard,
  ruinsBossIdentityForDescriptionCard,
  ruinsBossIdentityForScriptId,
  unregisteredImminentThreatHold,
  WEALD_BOSS_DESCRIPTION_CARD_ID,
  WEALD_BOSS_IDENTITIES,
  wealdBossIdentityForDescriptionCard,
  WARRENS_BOSS_DESCRIPTION_CARD_ID,
  WARRENS_BOSS_IDENTITIES,
  warrensBossIdentityForDescriptionCard,
} from "./threat-description-catalog";
export type {
  RuinsBossIdentity,
  WealdBossIdentity,
  WarrensBossIdentity,
} from "./threat-description-catalog";
export { applyActiveBossThreatToDungeon } from "./apply-active-boss-threat";
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
  ensureProphetIBossScriptRegistered,
  PROPHET_I_COMBAT_ABILITY_CARD_ID,
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
  PROPHET_I_SCRIPT_ID,
  prophetIBossScript,
} from "./prophet-i";
export {
  ensureHagIBossScriptRegistered,
  HAG_I_COMBAT_ABILITY_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_SCRIPT_ID,
  hagIBossScript,
} from "./hag-i";
export {
  ensureSwinePrinceIBossScriptRegistered,
  SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  swinePrinceIBossScript,
} from "./swine-prince-i";
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
  FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID,
  FIXTURE_BOSS_SCRIPT_ID,
  fixtureBossSkeletonScript,
} from "./fixture-skeleton";
export {
  encounterForcesRetreatAfterRound,
  isBossEncounter,
  resolveEncounterBossBattleRules,
} from "./encounter-rules";
export {
  bossQuestScriptId,
  faceTheThreatBossScriptByCampaignLevel,
  FACE_THE_THREAT_QUEST_ID,
  isBossQuestId,
  resolveBossScriptIdForQuest,
} from "./quest-bridge";
export type { BossQuestScriptContext } from "./quest-bridge";
