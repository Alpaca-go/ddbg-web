import type { NormalizedHeroSkillCard } from "../schema";
import {
  rangeEntries as crusaderRanges,
  statusEntries as crusaderStatus,
  supportEntries as crusaderSupport,
} from "./h01-crusader";
import { rangeEntries as hellionRanges, statusEntries as hellionStatus } from "./h02-hellion";
import {
  coreHigherRows as bountyHunterHigherRows,
  rangeEntries as bountyHunterRanges,
  statusEntries as bountyHunterStatus,
} from "./h03-bounty-hunter";
import {
  rangeEntries as highwaymanRanges,
  statusEntries as highwaymanStatus,
} from "./h04-highwayman";
import { rangeEntries as vestalRanges, statusEntries as vestalStatus } from "./h05-vestal";
import { coreHigherRows as jesterHigherRows, statusEntries as jesterStatus } from "./h06-jester";
import {
  coreHigherRows as plagueDoctorHigherRows,
  rangeEntries as plagueDoctorRanges,
  statusEntries as plagueDoctorStatus,
} from "./h07-plague-doctor";
import {
  coreHigherRows as arbalestHigherRows,
  rangeEntries as arbalestRanges,
  statusEntries as arbalestStatus,
} from "./h08-arbalest";
import {
  coreHigherRows as graveRobberHigherRows,
  rangeEntries as graveRobberRanges,
  statusEntries as graveRobberStatus,
} from "./h09-grave-robber";
import {
  coreHigherRows as occultistHigherRows,
  rangeEntries as occultistRanges,
  statusEntries as occultistStatus,
} from "./h10-occultist";
import {
  coreHigherRows as abominationHigherRows,
  rangeEntries as abominationRanges,
  statusEntries as abominationStatus,
} from "./h11-abomination";
import { manAtArmsAnnotations } from "./h12-man-at-arms";
import {
  flagellantAnnotations,
  rangeEntries as flagellantRanges,
  statusEntries as flagellantStatus,
} from "./h13-flagellant";
import { leperAnnotations, statusEntries as leperStatus } from "./h14-leper";
import { antiquarianAnnotations, statusEntries as antiquarianStatus } from "./h15-antiquarian";
import { shieldbreakerAnnotations } from "./h16-shieldbreaker";
import { houndmasterAnnotations } from "./h17-houndmaster";
import {
  musketeerAnnotations,
  rangeEntries as musketeerRanges,
  statusEntries as musketeerStatus,
} from "./h18-musketeer";
import { applyRangeEntries } from "./ranges";
import { applyStatusEffects } from "./status-effects";
import { applySupportEffects } from "./support-effects";
import type {
  CoreHigherSkillRow,
  HeroAnnotationModule,
  RangeEntry,
  StatusEffectEntry,
  SupportEffectEntry,
} from "./types";

export type {
  CoreHigherSkillFlags,
  CoreHigherSkillRow,
  HeroAnnotationApplier,
  HeroAnnotationModule,
  RangeEntry,
  StatusEffectEntry,
  SupportEffectEntry,
} from "./types";

/**
 * 核心盒 II/III 级逐卡注解，按 hNN 拼接。
 * 同一张卡只会出现在一个英雄文件里，顺序不影响 `core-higher-skills` 的按 id 查找。
 */
export const CORE_HIGHER_SKILL_ROWS: readonly CoreHigherSkillRow[] = [
  ...bountyHunterHigherRows,
  ...jesterHigherRows,
  ...plagueDoctorHigherRows,
  ...arbalestHigherRows,
  ...graveRobberHigherRows,
  ...occultistHigherRows,
  ...abominationHigherRows,
];

/**
 * 状态效果注解行，按 hNN 拼接。
 * 同一张卡的多行保持在同一份英雄文件里的原顺序，跨英雄顺序不影响结果。
 */
export const STATUS_EFFECTS: readonly StatusEffectEntry[] = [
  ...crusaderStatus,
  ...hellionStatus,
  ...bountyHunterStatus,
  ...highwaymanStatus,
  ...vestalStatus,
  ...jesterStatus,
  ...plagueDoctorStatus,
  ...arbalestStatus,
  ...graveRobberStatus,
  ...occultistStatus,
  ...abominationStatus,
  ...flagellantStatus,
  ...leperStatus,
  ...antiquarianStatus,
  ...musketeerStatus,
];

/** 已复核印刷区间行，按 hNN 拼接。 */
export const RANGES: readonly RangeEntry[] = [
  ...crusaderRanges,
  ...hellionRanges,
  ...bountyHunterRanges,
  ...highwaymanRanges,
  ...vestalRanges,
  ...plagueDoctorRanges,
  ...arbalestRanges,
  ...graveRobberRanges,
  ...occultistRanges,
  ...abominationRanges,
  ...flagellantRanges,
  ...musketeerRanges,
];

/** 已复核支援效果行（当前只有 Crusader 的 Inspiring Cry I–III）。 */
export const SUPPORT_EFFECTS: readonly SupportEffectEntry[] = [...crusaderSupport];

/**
 * 已入库的逐卡审校模块，按 hNN 升序排列。
 * 每个模块只碰自己英雄的卡，顺序不影响结果；新增英雄时在对应位置插入。
 */
export const HERO_ANNOTATIONS: readonly HeroAnnotationModule[] = [
  manAtArmsAnnotations,
  flagellantAnnotations,
  leperAnnotations,
  antiquarianAnnotations,
  shieldbreakerAnnotations,
  houndmasterAnnotations,
  musketeerAnnotations,
];

export function applyHeroAnnotations(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return HERO_ANNOTATIONS.reduce<NormalizedHeroSkillCard[]>(
    (current, module) => module.apply(current),
    [...cards],
  );
}

export function applyHeroStatuses(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyStatusEffects(cards, STATUS_EFFECTS);
}

export function applyHeroRanges(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyRangeEntries(cards, RANGES);
}

export function applyHeroSupport(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applySupportEffects(cards, SUPPORT_EFFECTS);
}
