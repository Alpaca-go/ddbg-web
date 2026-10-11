import { z } from "zod";
export { dungeonLayoutSchema, roomDistributionSchema } from "./dungeon-layout";
export type { DungeonLayout, RoomDistribution } from "./dungeon-layout";

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
} from "./extract/common";
export { RAW_CARD_CATEGORIES, RAW_SHEET_CATEGORIES, rawFileSchema } from "./extract/raw";
export type { RawFile } from "./extract/raw";
export {
  heroSkillCardSchema,
  heroSkillFileSchema,
  monsterLargeCardSchema,
  monsterLargeFileSchema,
  monsterMediumCardSchema,
  monsterMediumFileSchema,
  trinketCardSchema,
  trinketFileSchema,
} from "./extract/parsed";
export type {
  HeroSkillCard,
  HeroSkillFile,
  MonsterLargeCard,
  MonsterLargeFile,
  MonsterMediumCard,
  MonsterMediumFile,
  TrinketCard,
  TrinketFile,
} from "./extract/parsed";
export { extractSummarySchema, reconciliationReportSchema } from "./extract/reports";
export type { ExtractSummary, ReconciliationReport } from "./extract/reports";
export {
  ICON_STATUSES,
  iconDictionarySchema,
  iconEntrySchema,
  iconKeyConventionIssues,
  iconStatusSchema,
} from "./dictionary/schema";
export type { IconDictionary, IconEntry, IconStatus } from "./dictionary/schema";
export { buildNormalizedCorebox } from "./normalize/build";
export { monsterStanceGroupsSchema } from "./normalize/monster-stance";
export type { MonsterStanceGroups } from "./normalize/monster-stance";
export type { NormalizedCorebox, NormalizedCoreboxInput } from "./normalize/build";
export { loadNormalizedCorebox, writeNormalizedCorebox } from "./normalize/write";
export { roomTileGeometrySchema, roomTileGeometryFileSchema } from "./normalize/room-tile";
export type { RoomTileGeometryFile } from "./normalize/room-tile";
export { normalizedHeroStatCardSchema, normalizedHeroStatFileSchema } from "./normalize/hero-stat";
export type { NormalizedHeroStatCard, NormalizedHeroStatFile } from "./normalize/hero-stat";
export {
  NAMINGS,
  namingSchema,
  normalizedHeroSkillCardSchema,
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
} from "./normalize/schema";
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
} from "./normalize/schema";
