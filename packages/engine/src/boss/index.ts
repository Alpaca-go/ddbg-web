export type {
  BossBattleRules,
  BossCombatEntryRefs,
  BossFaceTheThreatContext,
  BossFaceTheThreatEmbarkPlan,
  BossFaceTheThreatEmbarkResult,
  BossHookName,
  BossHookOk,
  BossHookStubResult,
  BossMonsterTurnContext,
  BossScriptDefinition,
  BossScriptHooks,
  BossScriptId,
  BossSlotPlacementContext,
  BossSlotPlacementPlan,
  BossSlotPlacementResult,
  BossSummonContext,
  BossSummonOk,
  BossSummonPlacement,
  BossSummonPurpose,
  BossSummonResult,
  BossCollectAllContext,
  BossCollectAllOk,
  BossCollectAllResult,
  BossEnragedDestructionContext,
  BossEnragedDestructionOk,
  BossEnragedDestructionResult,
  BossSentenceRenderedContext,
  BossSentenceRenderedOk,
  BossSentenceRenderedResult,
  BossOneBodyMorphContext,
  BossOneBodyMorphOk,
  BossOneBodyMorphResult,
  FleshOneBodyPart,
  CollectorCollectedPart,
  BossThreatPassiveContext,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveDungeonResult,
  BossThreatPassiveHamletOk,
  BossThreatPassiveHamletResult,
  FaceTheThreatQuestContext,
} from "./types";
export { isHauntedGraveyardGuard } from "./necromancer-ii-graveyard";
export { readBossCombatEntry } from "./combat-entry";
export {
  cardIdsPermanentlyRemovedAfterBattle,
  hamletBuildingsBlockedByBossThreat,
  beastMonsterDamageBonusFromBossThreat,
  eldritchMonsterDamageBonusFromBossThreat,
  guardTurnsOnLargeMonsterSpawnFromBossThreat,
  markTurnsOnBattleStartFromBossThreat,
  sanitariumHealLifeDeltaFromBossThreat,
  stressOnDungeonEntryPerHeroFromBossThreat,
  stressOnHeroProvisionUseFromBossThreat,
  skipCurioDrawInCurioRoomsFromBossThreat,
  tavernStressRecoveryDeltaFromBossThreat,
  blackSheepStressDeltaFromBossThreat,
  creepingSicknessWoundsPerUnvisitedBuildingFromBossThreat,
} from "./threat-passive";
export {
  applyBossThreatBlackSheepBeforeHamletEvent,
  applyBossThreatCreepingSicknessEndOfHamletDay,
  applyBossThreatMarkedForDeathOnBattleStart,
  withLargeMonsterSpawnGuard,
  applyBossThreatStressOnDungeonEntry,
  applyBossThreatStressOnProvisionUse,
  completeCurioRoomWithoutCurioDraw,
  CREEPING_SICKNESS_HAMLET_BUILDINGS,
  effectiveHamletSanitariumHealAmount,
  effectiveHamletStressRecoveryAmount,
  monsterCombatThreatDamageBonus,
  monsterThreatFlatDamageBonus,
  readActiveBossThreatScript,
  shouldSkipCurioDrawInCurioRoom,
  transferCreepingSicknessBuildingWoundsToHero,
} from "./threat-passive-runtime";
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
  COVE_BOSS_DESCRIPTION_CARD_ID,
  COVE_BOSS_IDENTITIES,
  coveBossIdentityForDescriptionCard,
} from "./threat-description-catalog";
export type {
  RuinsBossIdentity,
  WealdBossIdentity,
  WarrensBossIdentity,
  CoveBossIdentity,
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
  ensureNecromancerIIBossScriptRegistered,
  necromancerIIBossScript,
  NECROMANCER_II_SCRIPT_ID,
  NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_II_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-ii";
export {
  ensureProphetIBossScriptRegistered,
  PROPHET_I_COMBAT_ABILITY_CARD_ID,
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
  PROPHET_I_RUBBLE_SKILL_SLOT,
  PROPHET_I_SCRIPT_ID,
  PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID,
  PROPHET_ROOM_CARD_ID,
  PROPHET_ROOM_D10_MARKERS,
  prophetD10RollMatchesMarker,
  prophetIBossScript,
  prophetRoomMarkerForD10Roll,
} from "./prophet-i";
export {
  applyProphetCalamitousPrognostication,
  applyProphetRubbleOfRuin,
  countWoodenPewsInArea,
  prophetActionIndexBeforeTurn,
  prophetCalamitousShouldReplaceSkill,
  prophetRubbleShouldReplaceSkill,
  prophetRoomD10AreaTableFromMarkers,
  PROPHET_I_FIRST_ACTION_INDEX,
  PROPHET_I_SECOND_ACTION_INDEX,
  PROPHET_I_THIRD_ACTION_INDEX,
  expandProphetIInitiativeDeckSides,
  prophetSecondActionUsesDefaultSkillSelection,
  prophetShouldEnterActedIdsAfterTurn,
  readProphetICalamitousEnabled,
  readProphetIRubbleEnabled,
  readProphetIWwoodenPewPlan,
  resolveProphetAreaIdForD10Roll,
} from "./prophet-i-combat-runtime";
export {
  ensureHagIBossScriptRegistered,
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  HAG_I_COMBAT_ABILITY_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_FIRST_ACTION_INDEX,
  HAG_I_INTO_THE_POT_SKILL_SLOT,
  HAG_I_SCRIPT_ID,
  hagIBossScript,
  hagICauldronBattleStartStance,
} from "./hag-i";
export {
  applyHagICauldronBattleStart,
  applyHagICauldronEmptyToFullMorph,
  bumpHagIActionRoundCount,
  chainHagICauldronFullAfterIntoThePot,
  hagActionIndexBeforeTurn,
  hagIntoThePotShouldForceSkill,
  readHagICauldronBattleStartPlan,
  readHagICauldronFullMorphPlan,
  readHagIIntoThePotEnabled,
  readHagIIntoThePotSkillSlot,
} from "./hag-i-combat-runtime";
export {
  ensureSwinePrinceIBossScriptRegistered,
  SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
  SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MARK_SKILL_SLOT,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  swinePrinceIBossScript,
  swinePrinceIWilburBattleStartStance,
} from "./swine-prince-i";
export {
  applySwinePrinceIWilburBattleStart,
  applySwinePrinceIEnragedDestruction,
  chainSwinePrinceIEnragedDestructionAfterHeroSkill,
  readSwinePrinceIEnragedDestructionEnabled,
  readSwinePrinceIEnragedDestructionSkillSlot,
  readSwinePrinceIWilburBattleStartPlan,
  readSwinePrinceIWilburMarkEnabled,
  readSwinePrinceIWilburMarkSkillSlot,
  swinePrinceIWilburMarkShouldForceSkill,
} from "./swine-prince-i-combat-runtime";
export {
  ensureSirenIBossScriptRegistered,
  SIREN_I_COMBAT_ABILITY_CARD_ID,
  SIREN_I_COMBAT_MONSTER_CARD_ID,
  SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
  SIREN_I_HIGH_TIDE_SKILL_SLOT,
  SIREN_I_PELAGIC_MONSTER_CARD_ID,
  SIREN_I_SCRIPT_ID,
  sirenIBossScript,
  sirenIPelagicHighTideStance,
} from "./siren-i";
export {
  applySirenIHighTidePelagicSummon,
  chainSirenIHighTidePelagicAfterMonsterSkill,
  readSirenIHighTidePelagicPlan,
  readSirenIHighTideSkillSlot,
  sirenIHighTideShouldSummonPelagic,
} from "./siren-i-combat-runtime";
export {
  ensureFleshIBossScriptRegistered,
  FLESH_I_COMBAT_ABILITY_CARD_ID,
  FLESH_I_COMBAT_MONSTER_CARD_ID,
  FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
  FLESH_I_SCRIPT_ID,
  FLESH_I_HEAD_MONSTER_CARD_ID,
  FLESH_I_BONE_MONSTER_CARD_ID,
  FLESH_I_HEART_MONSTER_CARD_ID,
  FLESH_I_BUTT_MONSTER_CARD_ID,
  FLESH_I_ONE_BODY_POOL_ID,
  FLESH_I_ONE_BODY_PART_ORDER,
  fleshIBossScript,
  fleshOneBodyPartCardId,
  fleshOneBodyPartStance,
} from "./flesh-i";
export {
  ensureCollectorIBossScriptRegistered,
  COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
  COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
  COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
  COLLECTOR_I_COLLECT_ALL_PART_ORDER,
  COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT,
  COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES,
  collectorCollectedPartCardId,
  collectorCollectedPartStance,
  collectorIBossScript,
} from "./collector-i";
export {
  applyCollectorCollectAll,
  collectorCollectAllShouldReplaceSkill,
  isCollectorCollectedMonsterCardId,
  readCollectorICollectAllEnabled,
  readCollectorICollectAllPartPlan,
  resolveCollectorCollectedAreaPlacement,
  shuffleCollectorCollectAllInitiativeIntoDeck,
} from "./collector-i-combat-runtime";
export {
  ensureFanaticIBossScriptRegistered,
  FANATIC_I_COMBAT_ABILITY_CARD_ID,
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
  FANATIC_I_SCRIPT_ID,
  fanaticIBossScript,
} from "./fanatic-i";
export {
  clearBossScriptsForTest,
  getBossScript,
  listBossScripts,
  registerBossScript,
} from "./registry";
export { DEFAULT_BOSS_BATTLE_RULES, encounterRoundRetreatLimit } from "./rules";
export { defaultMonsterTurnActionCount, runBossHook } from "./hooks";
export {
  BOSS_SLOT_WIRING_HOLD,
  canonicalBossSlotNodeIdsForLayout,
  defaultBossSlotPlacementHook,
  defaultFaceTheThreatEmbarkHook,
  FACE_EMBARK_WIRING_HOLD,
  R121_BOSS_SLOTS_QUEST_MAP_P011,
  R121_BOSS_SLOTS_QUEST_MAP_P012,
  R121_BOSS_SLOT_LAYOUTS,
  resolveBossScriptIdForFaceTheThreatContext,
  runBossSlotPlacementForScript,
  runFaceTheThreatEmbarkForQuest,
} from "./face-the-threat-hooks";
export {
  countCompletedRegularQuestsAtCampaignLevel,
  FACE_EMBARK_LAYOUT_WIRING_HOLD,
  readStoredFaceTheThreatEmbarkPlan,
  REGULAR_QUESTS_PER_ACT_BEFORE_FACE_THE_THREAT,
  requireFaceTheThreatEmbarkPlanForSandbox,
  resolveFaceTheThreatEmbarkForChoose,
  resolveFaceTheThreatOfferAtNextQuest,
  shouldForceFaceTheThreatOfferAtNextQuest,
  storedFaceTheThreatEmbarkPlanFromHook,
} from "./face-the-threat-embark-runtime";
export type { StoredFaceTheThreatEmbarkPlan } from "./face-the-threat-embark-runtime";
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
  resolveEncounterBossScriptId,
} from "./encounter-rules";
export {
  applyFanaticIPyreBattleStart,
  applyFanaticPitTossHeroIntoPyreArea,
  applyFanaticSentenceRendered,
  bumpFanaticIActionRoundCount,
  expandFanaticIInitiativeDeckSides,
  fanaticSentenceRenderedShouldReplaceSkill,
  fanaticShouldEnterActedIdsAfterTurn,
  pyreAreaHasSpaceForHero,
  readFanaticIPitTossEnabled,
  readFanaticIPyreBattleStartPlan,
  readFanaticISentenceRenderedEnabled,
} from "./fanatic-i-combat-runtime";
export {
  applyFleshIOneBodyBattleStart,
  applyFleshOneBodyMorphAtRoundStart,
  isFleshOneBodyCombatMonsterCardId,
  readFleshIOneBodyMorphEnabled,
  readFleshIOneBodyPartBattleStartPlan,
  reconcileFleshOneBodyPools,
  withFleshOneBodyPoolState,
} from "./flesh-i-combat-runtime";
export {
  bossQuestScriptId,
  faceTheThreatBossScriptByCampaignLevel,
  FACE_THE_THREAT_QUEST_ID,
  isBossQuestId,
  isFaceTheThreatQuestId,
  resolveBossScriptIdForQuest,
} from "./quest-bridge";
export type { BossQuestScriptContext } from "./quest-bridge";
export {
  ensureDarkestMidBossScriptsRegistered,
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
  darkestMidBossScriptIdForQuest,
  readDarkestMidBossRequiredCombatCardIds,
} from "./darkest-mid-boss-scripts";
export {
  darkestMidBossDeploymentHold,
  prepareDarkestMidBossDeployment,
  prepareDarkestObjectiveBossRoom,
  readDarkestMidBossDeployedCardIds,
  type StoredDarkestBossEncounterPlan,
} from "./darkest-mid-boss-runtime";
export {
  deployDarkestMidBoss,
  darkestMidBossCombatActive,
  expandDarkestMidBossInitiativeDeckSides,
} from "./darkest-mid-boss-deploy";
export {
  applyShufflingHorrorEchoingDisassembly,
  applyShufflingHorrorUndulations,
  DARKEST_MID_BOSS_HERO_STANCE_AREAS,
  DARKEST_MID_BOSS_MONSTER_STANCE_AREAS,
  SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  SHUFFLING_HORROR_ECHOING_SUMMON_CARD_IDS,
} from "./darkest-shuffling-horror-combat-runtime";
export {
  applyMammothCystSummonWhiteCell,
  MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
} from "./darkest-mammoth-cyst-combat-runtime";
export {
  applyGestatingHeartSummon,
  type ApplyGestatingHeartSummonCommand,
} from "./gestating-heart-summon";
export {
  ANCESTOR_1_MONSTER_CARD_ID,
  TIME_HEALS_ALL_HEAL_AMOUNT,
  TIME_HEALS_ALL_SKILL_SLOT,
  applyAncestor1TimeHealsAll,
  type ApplyAncestor1TimeHealsAllCommand,
} from "./ancestor1-time-heals-all";
export { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";

export {
  ensureNecromancerIIIBossScriptRegistered,
  necromancerIIIBossScript,
  NECROMANCER_III_SCRIPT_ID,
  NECROMANCER_III_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_III_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-iii";
