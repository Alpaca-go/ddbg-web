export { applyCommand, createInitialState } from "./shared/core/command";
export { readWealdOakAction } from "./weald/burning-oak";
export { readInfectedOakAction } from "./shared/battle/battle-infected-oak";
export { buildWealdMonsterCatalog } from "./weald/monster-catalog";
export { buildWealdHigherMonsterCatalog } from "./weald/higher-monster-catalog";
export { buildWealdHigherMonsterPool } from "./weald/higher-monster-pool";
export type { WealdBattleMonster } from "./weald/monster-catalog";
export { canSetDungeonStances, DUNGEON_HERO_STANCES } from "./shared/dungeon/dungeon-stances";
export { canSetHamletStances } from "./shared/hamlet/hamlet-stances";
export { readRoomTile } from "./shared/core/room-tile-selection";
export { resolveQuestMapEdgeCorridor } from "./shared/dungeon/corridor-tile-catalog";
export type { CorridorLayoutBinding } from "./shared/dungeon/corridor-tile-catalog";
export { createTrinketPool } from "./shared/trinkets/trinket-acquisition";
export {
  fortunateArmletUseProblem,
  FORTUNATE_ARMLET_ID,
} from "./shared/battle/battle-fortunate-armlet";
export type { TrinketPool } from "./shared/trinkets/trinket-acquisition";
export { createDungeonSandbox, startingGoldForMode } from "./shared/dungeon/dungeon";
export type {
  DungeonState,
  DungeonCommand,
  DungeonExplorationSetup,
  DungeonCurioState,
  DungeonBattleCatalog,
} from "./shared/dungeon/dungeon";
export { createBattleState } from "./shared/battle/battle";
export { createConditionPool, gainNegativeQuirk } from "./shared/core/conditions";
export type { ConditionPool } from "./shared/core/conditions";
export type { PlayHeroSkillTargetsCommand } from "./shared/battle/battle-hero-targets";
export type { PlayHeroSkillEmptyAreaCommand } from "./shared/battle/battle-empty-area";
export type { HeroSkillTargetsResolvedEvent } from "./shared/core/command";
export type { MoveHeroCommand, HeroMovedEvent } from "./shared/battle/battle-hero-movement";
export { roomTileBattleAreas } from "./shared/battle/battle-monster-movement";
export { readActiveStygianRoom } from "./shared/core/stygian-room-effects";
export type {
  MoveMonsterToRangeCommand,
  MonsterPositionedEvent,
} from "./shared/battle/battle-monster-movement";
export type { EncounterCommand, EncounterEvent, EncounterState } from "./shared/dungeon/encounter";
export type { PlayMonsterSkillCommand } from "./shared/battle/battle-monster";
export type {
  PrepareMonsterActionCommand,
  PreparedMonsterAction,
  MonsterActionPreparedEvent,
} from "./shared/battle/battle-monster-action";
export type {
  BattleArea,
  BattleEntity,
  BattleSetup,
  BattleState,
  PlayHeroSkillCommand,
} from "./shared/battle/battle";
export type {
  ApplyResult,
  Command,
  GameEvent,
  GameState,
  PendingChoice,
} from "./shared/core/command";
export {
  resolveHeroSkill,
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
  readHeroSkillStanceMarks,
  aggregateLitHeroSkillStanceCounts,
  HERO_SKILL_STANCE_DISPLAY_ORDER,
} from "./core/heroes/hero-skill";
export {
  EMBARK_FRONT_STANCE_PRIORITY,
  EMBARK_ROSTER_SLOT_STANCES,
  embarkRosterSlotIndexForStance,
  embarkStanceForRosterSlot,
  preferredEmbarkStanceFromLitCounts,
  preferredEmbarkStanceFromSelectedSkills,
  resolveEmbarkRosterSlotIndex,
  moveEmbarkRosterSeatToSlot,
} from "./shared/hamlet/embark-roster-placement";
export type { EmbarkRosterSlotIndex } from "./shared/hamlet/embark-roster-placement";
export { resolveSkillHeroHealth } from "./core/heroes/skill-hero-health";
export type { SkillHeroHealth, SkillHeroHealthResult } from "./core/heroes/skill-hero-health";
export type {
  SkillHealthEffect,
  SkillEffectsResolution,
  HeroSkillStanceMark,
} from "./core/heroes/hero-skill";
export { resolveMonsterSkill, resolveMonsterSkillEffects } from "./shared/core/monster-skill";
export { selectMonsterTarget } from "./shared/core/monster-target";
export { selectMonsterSkill } from "./shared/core/monster-stance";
export type {
  MonsterStanceGroup,
  MonsterStanceCardView,
  MonsterSkillSelection,
} from "./shared/core/monster-stance";
export type {
  MonsterTargetCardView,
  MonsterTargetHero,
  MonsterTargetSelection,
} from "./shared/core/monster-target";
export { resolveShuffle } from "./shared/core/shuffle";
export type { ShuffleIntent, ShuffleResolution } from "./shared/core/shuffle";
export type {
  MonsterCardView,
  MonsterCombatState,
  MonsterSkillResolution,
  MonsterSkillView,
} from "./shared/core/monster-skill";
export type {
  HeroSkillCardView,
  HeroSkillResolution,
  SkillActorState,
  SkillAreaHero,
  SkillCombatState,
  SkillForm,
  SkillIconRef,
  SkillSegment,
  SkillShuffle,
  SkillStance,
  SkillTargetSide,
  SkillTargetState,
  SkippedSkillEffect,
} from "./core/heroes/hero-skill";
export { createRng, rollD10 } from "./shared/core/rng";
export type { Rng } from "./shared/core/rng";
export { resolvePressure } from "./shared/core/pressure";
export type { ResolveCard } from "./shared/core/pressure";
export { spawnMonsters } from "./shared/core/spawn";
export type { SpawnCard, SpawnPlacement } from "./shared/core/spawn";
export { createLootState, nextProvisionFace } from "./shared/trinkets/loot";
export { PROVISION_EFFECTS } from "./shared/core/provision-use";
export type { ProvisionEffect } from "./shared/core/provision-use";
export type { LootState, LootKind, LootToken, ProvisionFace } from "./shared/trinkets/loot";
export { addStatusStack, tickStatusStacks, statusProjection } from "./shared/core/status";
export type { StatusKind, StatusStack, StatusEffect } from "./shared/core/status";
export { resolveHeroHealth, resolveSeededHeroHealth } from "./core/heroes/hero-health";
export type {
  HeroHealthState,
  HeroHealthEffect,
  HeroHealthResolution,
  DeathDoorFace,
} from "./core/heroes/hero-health";
export { canLeaveDungeon } from "./shared/dungeon/dungeon-exit";
export { canRestDungeon } from "./shared/dungeon/dungeon-rest";
export { canSetupForwardCamp, setupForwardCamp } from "./shared/dungeon/dungeon-forward-camp";
export { dungeonProvisionWindow } from "./shared/dungeon/dungeon-provision-window";

export { isInvokingMonster } from "./shared/battle/battle-invocation";

export { createCoreDungeonQuest } from "./shared/dungeon/dungeon-quest-entry";
export type { CoreQuestSources, QuestParty } from "./shared/dungeon/dungeon-quest-entry";
export {
  FORMAL_HERO_NAMES,
  FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS,
  isFormalHeroName,
  heroHasUnwiredCombatSkills,
} from "./core/heroes/formal-heroes";
export type { FormalHeroName } from "./core/heroes/formal-heroes";
export {
  FORMAL_HEROES_VERIFIED_ATTRIBUTES,
  FORMAL_HEROES_PARTIAL_CORE_SKILLS,
  formalRosterPendingHeroStats,
  formalRosterArtOnlySkills,
  formalRosterLevel1ArtSkillIds,
  isFormalHeroVerifiedAttributes,
  isFormalHeroRosterPendingAttributes,
  isFormalRosterArtSkill,
  embarkSkillAllowed,
  skillBelongsToFormalHero,
  verifiedLevel1CombatSkillsForHero,
  WARRENS_VERIFIED_SKILL_PAGE_BLOCKS,
  COVE_VERIFIED_SKILL_PAGE_BLOCKS,
  WEALD_VERIFIED_SKILL_PAGE_BLOCKS,
  MUSKETEER_VERIFIED_SKILL_PAGE_BLOCKS,
  ABOMINATION_DOUBLE_FACED_SKILL_IDS,
} from "./shared/core/formal-roster-catalog";
export { createQuestSave, loadQuestSave } from "./shared/quest/quest-save";
export { currentHamletEvent, caretakerBuilding } from "./shared/hamlet/hamlet-event";
export { warmUpDarkRoomNeedsTorch } from "./shared/dungeon/dungeon-light";
export { readFinalFormSequence } from "./core/bosses/final/final-form-sequence";
export type { QuestStart } from "../../data/src/shared/quest-save";
export { currentHamletHero, hamletActionOptions } from "./shared/hamlet/hamlet-actions";
export { visitNomadWagon } from "./shared/hamlet/hamlet-nomad";
export { blacksmithOptions } from "./shared/hamlet/hamlet-blacksmith";
export { offerNextQuest } from "./shared/hamlet/hamlet-embark";
export { advanceCampaignLevel, readCampaignLevel } from "./shared/hamlet/hamlet-campaign";
export {
  buildRuinsActTransitionPlan,
  buildWealdActTransitionPlan,
} from "./shared/hamlet/act-transition-plan";
export { switchWealdActPools } from "./shared/hamlet/act-transition-pools";
export { wealdLocationActAdvanceEnabled } from "./shared/hamlet/act-transition-readiness";
export {
  readRuinsActTransitionReadiness,
  requiresRuinsActAdvance,
} from "./shared/hamlet/act-transition-readiness";
export type { RuinsActTransitionReadiness } from "./shared/hamlet/act-transition-readiness";
export { switchRuinsActPools } from "./shared/hamlet/act-transition-pools";
export type { ActPoolSwitch } from "./shared/hamlet/act-transition-pools";
export { advanceRuinsAct } from "./shared/core/advance-ruins-act";
export {
  DARKEST_QUEST_IDS,
  darkestActEntryPending,
  enterDarkestDungeon,
  readDarkestDungeonEntryReadiness,
} from "./core/darkest/darkest-entry";
export type { DarkestDungeonEntryReadiness, DarkestQuestId } from "./core/darkest/darkest-entry";
export { visitGuild } from "./shared/hamlet/hamlet-guild";
export {
  setEquippedSkills,
  ownedHeroSkills,
  unequippedHeroSkills,
  heroSkillSlotCount,
  heroTrinketSlotCount,
} from "./core/heroes/hero-loadout";
export {
  recoveryBuildings,
  upgradableBuildings,
  recoveryBuildingLevel,
  stagecoachWaitingTokens,
  upgradeHamletBuilding,
} from "./shared/hamlet/hamlet-buildings";
export {
  bossQuestScriptId,
  faceTheThreatBossScriptByCampaignLevel,
  cardIdsPermanentlyRemovedAfterBattle,
  clearBossScriptsForTest,
  DEFAULT_BOSS_BATTLE_RULES,
  defaultMonsterTurnActionCount,
  encounterForcesRetreatAfterRound,
  encounterRoundRetreatLimit,
  ensureCoreBossScriptsRegistered,
  ensureFixtureBossScriptRegistered,
  ensureNecromancerIBossScriptRegistered,
  ensureProphetIBossScriptRegistered,
  ensureCollectorIBossScriptRegistered,
  ensureFanaticIBossScriptRegistered,
  ensureHagIBossScriptRegistered,
  ensureSwinePrinceIBossScriptRegistered,
  ensureSirenIBossScriptRegistered,
  ensureFleshIBossScriptRegistered,
  FACE_THE_THREAT_QUEST_ID,
  FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID,
  FIXTURE_BOSS_SCRIPT_ID,
  fixtureBossSkeletonScript,
  getBossScript,
  hamletBuildingsBlockedByBossThreat,
  beastMonsterDamageBonusFromBossThreat,
  eldritchMonsterDamageBonusFromBossThreat,
  stressOnDungeonEntryPerHeroFromBossThreat,
  tavernStressRecoveryDeltaFromBossThreat,
  isBossEncounter,
  isBossQuestId,
  listBossScripts,
  NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
  necromancerIBossScript,
  PROPHET_I_COMBAT_ABILITY_CARD_ID,
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
  PROPHET_I_SCRIPT_ID,
  prophetIBossScript,
  HAG_I_COMBAT_ABILITY_CARD_ID,
  HAG_I_CAULDRON_ABILITY_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_SCRIPT_ID,
  hagIBossScript,
  SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  swinePrinceIBossScript,
  SIREN_I_COMBAT_ABILITY_CARD_ID,
  SIREN_I_COMBAT_MONSTER_CARD_ID,
  SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
  SIREN_I_SCRIPT_ID,
  sirenIBossScript,
  guardTurnsOnLargeMonsterSpawnFromBossThreat,
  skipCurioDrawInCurioRoomsFromBossThreat,
  COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  collectorIBossScript,
  FANATIC_I_COMBAT_ABILITY_CARD_ID,
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  FANATIC_I_SCRIPT_ID,
  fanaticIBossScript,
  FLESH_I_COMBAT_ABILITY_CARD_ID,
  FLESH_I_COMBAT_MONSTER_CARD_ID,
  FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
  FLESH_I_SCRIPT_ID,
  fleshIBossScript,
  sanitariumHealLifeDeltaFromBossThreat,
  stressOnHeroProvisionUseFromBossThreat,
  readBossCombatEntry,
  registerBossScript,
  resolveBossScriptIdForQuest,
  resolveEncounterBossBattleRules,
  runBossHook,
  runFaceTheThreatEmbarkForQuest,
  runBossSlotPlacementForScript,
  defaultFaceTheThreatEmbarkHook,
  defaultBossSlotPlacementHook,
  R121_BOSS_SLOT_LAYOUTS,
  setActiveBossThreat,
  establishImminentThreat,
  drawImminentThreatAfterActAdvance,
  readActiveBossThreatScriptId,
  applyBossThreatAfterBattleToPool,
  clearedBossThreatScriptIdAfterVictory,
  syncHamletBlockedBuildingsForBossThreat,
} from "./core/bosses/index";
export type {
  BossBattleRules,
  BossCombatEntryRefs,
  BossFaceTheThreatEmbarkPlan,
  BossFaceTheThreatEmbarkResult,
  BossHookName,
  BossHookOk,
  BossHookStubResult,
  BossQuestScriptContext,
  BossScriptDefinition,
  BossScriptHooks,
  BossScriptId,
  BossSlotPlacementPlan,
  BossSlotPlacementResult,
  FaceTheThreatQuestContext,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
  SetActiveBossThreatCommand,
  EstablishImminentThreatCommand,
  DrawImminentThreatAfterActAdvanceCommand,
  RuinsBossIdentity,
  WealdBossIdentity,
  WarrensBossIdentity,
} from "./core/bosses/index";
export {
  dungeonMonsterPoolThrough,
  combatCardIdForPoolInstance,
} from "./shared/core/monster-pool-runtime";
export { isHauntedGraveyardGuard } from "./core/bosses/necromancer/necromancer-ii-graveyard";
export { HERO_SKILL_TRINKET_IDS } from "../../data/src/core/heroes/hero-skill-trinkets";

export {
  FREE_TRINKET_IDS,
  FREE_TRINKET_INVERTED_ACTIVE_USE,
  FREE_TRINKET_INVERTED_DEFENCE_REACTION,
  isFreeTrinketId,
  freeTrinketUseProblem,
} from "./shared/battle/battle-free-trinkets";

export {
  coreTrinketFreeActions,
  coreTrinketFreeProblem,
} from "./shared/trinkets/core-trinket-free";

export { heroMovePathLimit } from "./shared/battle/battle-hero-movement";

export {
  darkestBossVictoryAfterEncounter,
  readFinalBattlePlanAfterDarkestVictory,
} from "./core/bosses/darkest/darkest-content";
export {
  sourcesForContentPacks,
  CONTENT_PACKS,
  CONTENT_PACK_IDS,
} from "./shared/core/content-packs";
export { createCampaignQuest } from "./shared/hamlet/campaign-entry";
export { initialQuestDrawModes, drawInitialQuestOffers } from "./shared/hamlet/initial-quest-draw";
export type { HamletQuestDrawOptionId } from "./shared/hamlet/hamlet-location-quest-draw";
export type { ContentPackId } from "./shared/core/content-packs";
export {
  buildWealdLevelOneMonsterPool,
  createWealdLevelOneMonsterPoolState,
} from "./weald/monster-pool";
export {
  NECROTIC_FUNGUS_MONSTER_CARD,
  NECROTIC_FUNGUS_MONSTER_CARD_ID,
  isLivingCombatMonster,
  isNecroticFungusEntity,
  necroticFungusBlocksHealing,
  necroticFungusEntitiesForTile,
} from "./weald/necrotic-fungus";
export {
  wealdMechanicsActive,
  wealdRoomTileBattleAreas,
  wealdZeroCapacityEndTurnRefusal,
} from "./weald/mechanics";
export { rebuildLocationQuestDecks } from "./shared/quest/location-quest-sources";
