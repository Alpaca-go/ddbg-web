import { z } from "zod";
export {
  monsterPoolCatalogSchema,
  monsterPoolFileSchema,
  ruinsMonsterPool,
  ruinsMonsterPoolThrough,
} from "./core/monsters/monster-pool";
export type { MonsterPoolCard } from "./core/monsters/monster-pool";
export {
  darkestMonsterPoolFileSchema,
  darkestDungeonMonsterInstances,
} from "./core/monsters/darkest-monster-pool";
export type { DarkestMonsterPoolFile } from "./core/monsters/darkest-monster-pool";
export {
  curioCardSchema,
  curioCatalogSchema,
  curioFileSchema,
  wealdCurioCatalogSchema,
  wealdCurioFileSchema,
  coveCurioCatalogSchema,
  coveCurioFileSchema,
  planCurioEffects,
} from "./core/curios/curio";
export type { CurioCard, CurioEffect } from "./core/curios/curio";
export { diseaseCardSchema, diseaseFileSchema, diseaseRuleSchema } from "./core/hamlet/disease";
export type { DiseaseCard, DiseaseFile, DiseaseRule } from "./core/hamlet/disease";
export { buildDiseases } from "./core/hamlet/disease.build";
export { explorationFaceSchema, explorationDieSchema } from "./shared/exploration";
export type { ExplorationFace } from "./shared/exploration";
export {
  dungeonLayoutSchema,
  dungeonLayoutFileSchema,
  randomNonObjectiveRoomKinds,
  roomDistributionEmbarkBlockReason,
  roomDistributionSchema,
  roomDistributionTokenTotal,
} from "./core/tiles/dungeon-layout";
export type { DungeonLayout, RoomDistribution, RoomTokenKind } from "./core/tiles/dungeon-layout";
export {
  asQuestMapPairingQuest,
  basicQuestExpeditionRegion,
  sandboxEmbarkQuests,
  sandboxEmbarkQuestsForPacks,
  isSandboxWealdEmbarkQuest,
  SANDBOX_WEALD_EMBARK_QUEST_IDS,
} from "./core/quests/basic-quests";
export {
  compatibleQuestMapLayouts,
  coreQuestMapLayouts,
  dungeonLayoutRoomSlotCount,
  expeditionLocationEmbarkBlockReason,
  inferQuestMapRegion,
  isQuestMapPageHardBind,
  pickEmbarkQuestMapLayout,
  pickQuestMapLayout,
  pickQuestMapLayoutId,
  questIdPageNumber,
  questMapLayoutMatchesExpedition,
  questMapLayoutPageNumber,
  formalWealdProductionEmbarkAllowed,
  sandboxExpeditionEmbarkBlockReason,
} from "./core/quests/quest-map-pairing";
export type { QuestExpeditionRegion, QuestMapPairingInput } from "./core/quests/quest-map-pairing";
export {
  buildNonObjectiveRoomTokenPool,
  drawAndMaterializeRoomDistribution,
  drawRoomKindsWithoutReplacement,
  materializeRoomDistribution,
  nonObjectiveRoomTokenPoolCopiesPerKind,
} from "./core/rooms/room-distribution-expand";

/** 早期占位。卡牌数据用 normalize 里的 schema。 */
export const placeholderRecordSchema = z.object({
  id: z.string().min(1),
});

export type PlaceholderRecord = z.infer<typeof placeholderRecordSchema>;

export {
  bboxSchema,
  copyVariantSchema,
  iconIdSchema,
  iconRefSchema,
  levelSchema,
  pageListSchema,
  quarterTurnSchema,
  unlabeledNumberSchema,
} from "./shared/extract/common";
export { RAW_CARD_CATEGORIES, RAW_SHEET_CATEGORIES, rawFileSchema } from "./shared/extract/raw";
export type { RawFile } from "./shared/extract/raw";
export {
  heroSkillCardSchema,
  heroSkillFileSchema,
  monsterLargeCardSchema,
  monsterLargeFileSchema,
  monsterMediumCardSchema,
  monsterMediumFileSchema,
  trinketCardSchema,
  trinketFileSchema,
} from "./shared/extract/parsed";
export type {
  HeroSkillCard,
  HeroSkillFile,
  MonsterLargeCard,
  MonsterLargeFile,
  MonsterMediumCard,
  MonsterMediumFile,
  TrinketCard,
  TrinketFile,
} from "./shared/extract/parsed";
export { extractSummarySchema, reconciliationReportSchema } from "./shared/extract/reports";
export type { ExtractSummary, ReconciliationReport } from "./shared/extract/reports";
export {
  ICON_STATUSES,
  iconDictionarySchema,
  iconEntrySchema,
  iconKeyConventionIssues,
  iconStatusSchema,
} from "./shared/dictionary/schema";
export type { IconDictionary, IconEntry, IconStatus } from "./shared/dictionary/schema";
export { buildNormalizedCorebox } from "./core/corebox.build";
export { monsterStanceGroupsSchema } from "./shared/monster-stance";
export type { MonsterStanceGroups } from "./shared/monster-stance";
export type { NormalizedCorebox, NormalizedCoreboxInput } from "./core/corebox.build";
export { roomTileGeometrySchema, roomTileGeometryFileSchema } from "./core/tiles/room-tile";
export type { RoomTileGeometryFile } from "./core/tiles/room-tile";
export {
  corridorLayoutBindingFileSchema,
  corridorLayoutBindingSchema,
  lookupCorridorLayoutBinding,
  resolveCorridorLayoutBinding,
  corridorBindingKey,
} from "./core/tiles/corridor-layout-bindings";
export type { CorridorLayoutBinding } from "./core/tiles/corridor-layout-bindings";
export {
  canonicalHeroStatCardSchema,
  normalizedHeroStatCardSchema,
  normalizedHeroStatFileSchema,
} from "./core/heroes/hero-stat.build";
export type { NormalizedHeroStatCard, NormalizedHeroStatFile } from "./core/heroes/hero-stat.build";
export {
  NAMINGS,
  namingSchema,
  normalizedHeroSkillCardSchema,
  canonicalHeroSkillFileSchema,
  normalizedHeroSkillFileSchema,
  normalizedIconSchema,
  normalizedMonsterLargeCardSchema,
  normalizedMonsterLargeFileSchema,
  normalizedMonsterMediumCardSchema,
  normalizedMonsterMediumFileSchema,
  normalizedQuirkCardSchema,
  normalizedQuirkFileSchema,
  normalizedTrinketCardSchema,
  normalizedTrinketFileSchema,
  normalizedUnlabeledNumberSchema,
  normalizedVirtueAfflictionCardSchema,
  normalizedVirtueAfflictionFileSchema,
  verificationSchema,
} from "./shared/schema";
export type {
  NormalizedHeroSkillCard,
  NormalizedHeroSkillFile,
  NormalizedIcon,
  NormalizedMonsterLargeCard,
  NormalizedMonsterLargeFile,
  NormalizedMonsterMediumCard,
  NormalizedMonsterMediumFile,
  NormalizedQuirkCard,
  NormalizedQuirkFile,
  NormalizedTrinketCard,
  NormalizedTrinketFile,
  NormalizedVirtueAfflictionCard,
  NormalizedVirtueAfflictionFile,
  Segment,
} from "./shared/schema";

export * from "./core/rooms/room";
export { buildRooms } from "./core/rooms/room.build";
export { wealdRoomCardSchema, wealdRoomFileSchema } from "./weald/rooms/room";
export type { WealdRoomCard } from "./weald/rooms/room";
export { wealdRoomTileGeometryFileSchema, wealdRoomTileSchema } from "./weald/tiles/room-tile";
export type { WealdRoomTile } from "./weald/tiles/room-tile";
export { wealdHagContentSchema, wealdHagTileSchema } from "./weald/bosses/hag/hag";
export type { WealdHagContent } from "./weald/bosses/hag/hag";
export { wealdHagHigherContentSchema } from "./weald/bosses/hag/hag-higher";
export type { WealdHagHigherContent } from "./weald/bosses/hag/hag-higher";

export {
  absoluteNothingnessSupportSchema,
  findAbsoluteNothingnessMonsterCards,
  readAbsoluteNothingnessSupport,
} from "./core/bosses/absolute-nothingness-support";
export { buildAbsoluteNothingnessSupport } from "./core/bosses/absolute-nothingness-support.build";
export type { AbsoluteNothingnessSupport } from "./core/bosses/absolute-nothingness-support";
export {
  darkestBossContentSchema,
  finalBattlePlanForQuest,
} from "./core/bosses/darkest-boss-content";
export type { DarkestBossContent } from "./core/bosses/darkest-boss-content";
export {
  darkestBossAbilitiesSchema,
  readDarkestBossAbility,
} from "./core/bosses/darkest-boss-abilities";
export type { DarkestBossAbilities } from "./core/bosses/darkest-boss-abilities";
export { ruinsBossAbilitiesSchema, readRuinsBossAbility } from "./core/bosses/ruins-boss-abilities";
export type { RuinsBossAbilities } from "./core/bosses/ruins-boss-abilities";
export { questCardsSchema, readQuestCard } from "./core/quests/quest-cards";
export type { QuestCards } from "./core/quests/quest-cards";
export { readQuestMonsterPlan } from "./core/monsters/quest-monster-plan";
export type { QuestMonsterPlan } from "./core/monsters/quest-monster-plan";
export { stygianRoomsSchema, readStygianRoomReplacement } from "./core/rooms/stygian-rooms";
export {
  wealdStygianRoomsSchema,
  readWealdStygianRoomReplacement,
} from "./weald/rooms/stygian-rooms";
export {
  coveBossRoomCardSchema,
  coveNormalRoomCardSchema,
  coveRoomCardSchema,
  coveRoomCatalogSchema,
  coveRoomFileSchema,
  COVE_ROOM_BACK,
  COVE_ROOM_FRONT,
} from "./cove/rooms/room";
export type { CoveBossRoomCard, CoveRoomCard } from "./cove/rooms/room";
export type { StygianRooms } from "./core/rooms/stygian-rooms";
export { curioPoolIdentity, locationCurioPool } from "./core/curios/curio-pool";

export { wealdPounderHigherContentSchema } from "./weald/bosses/pounder/pounder-higher";
export type { WealdPounderHigherContent } from "./weald/bosses/pounder/pounder-higher";

export { wealdShriekerHigherContentSchema } from "./weald/bosses/shrieker/shrieker-higher";
export type { WealdShriekerHigherContent } from "./weald/bosses/shrieker/shrieker-higher";
