import type { NormalizedHeroSkillCard } from "../schema";
import {
  rangeEntries as crusaderRanges,
  selfEffectEntries as crusaderSelfEffects,
  statusEntries as crusaderStatus,
  supportEntries as crusaderSupport,
  damageEntries as crusaderDamage,
} from "./h01-crusader";
import {
  layoutEntries as hellionLayouts,
  rangeEntries as hellionRanges,
  statusEntries as hellionStatus,
} from "./h02-hellion";
import {
  bountyStatusRows,
  coreHigherRows as bountyHunterHigherRows,
  layoutEntries as bountyHunterLayouts,
  rangeEntries as bountyHunterRanges,
  statusEntries as bountyHunterStatus,
  damageEntries as bountyHunterDamage,
} from "./h03-bounty-hunter";
import {
  rangeEntries as highwaymanRanges,
  statusEntries as highwaymanStatus,
  damageEntries as highwaymanDamage,
} from "./h04-highwayman";
import {
  damageEntries as vestalDamage,
  rangeEntries as vestalRanges,
  selfEffectEntries as vestalSelfEffects,
  statusEntries as vestalStatus,
} from "./h05-vestal";
import {
  coreHigherRows as jesterHigherRows,
  layoutEntries as jesterLayouts,
  selfEffectEntries as jesterSelfEffects,
  statusEntries as jesterStatus,
  targetStressEntries as jesterTargetStress,
} from "./h06-jester";
import {
  coreHigherRows as plagueDoctorHigherRows,
  rangeEntries as plagueDoctorRanges,
  selfEffectEntries as plagueDoctorSelfEffects,
  statusEntries as plagueDoctorStatus,
} from "./h07-plague-doctor";
import {
  coreHigherRows as arbalestHigherRows,
  rallyingFlareEntries as arbalestRallyingFlare,
  rangeEntries as arbalestRanges,
  statusEntries as arbalestStatus,
  damageEntries as arbalestDamage,
} from "./h08-arbalest";
import {
  coreHigherRows as graveRobberHigherRows,
  layoutEntries as graveRobberLayouts,
  rangeEntries as graveRobberRanges,
  statusEntries as graveRobberStatus,
  damageEntries as graveRobberDamage,
} from "./h09-grave-robber";
import {
  coreHigherRows as occultistHigherRows,
  rangeEntries as occultistRanges,
  statusEntries as occultistStatus,
  damageEntries as occultistDamage,
} from "./h10-occultist";
import {
  coreHigherRows as abominationHigherRows,
  rangeEntries as abominationRanges,
  selfEffectEntries as abominationSelfEffects,
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
  rallyingFlareEntries as musketeerRallyingFlare,
  rangeEntries as musketeerRanges,
  statusEntries as musketeerStatus,
  damageEntries as musketeerDamage,
} from "./h18-musketeer";
import { applyBountyStatuses } from "./bounty-statuses";
import { applyDamage } from "./damage";
import { applyLayouts } from "./layout";
import { applyRallyingFlare } from "./rallying-flare";
import { applyRemoval } from "./removal";
import { REMOVAL_RULES } from "./removal-data";
import { applySelfEffects } from "./self-effects";
import { applyTargetStress } from "./target-stress";
import { applyTextRules } from "./text-rules";
import { IGNORES_RULES, SHUFFLE_RULES } from "./text-rules-data";
import { applyRangeEntries } from "./ranges";
import { applyStatusEffects } from "./status-effects";
import { applySupportEffects } from "./support-effects";
import type {
  BountyStatusRow,
  DamageEntry,
  CoreHigherSkillRow,
  HeroAnnotationModule,
  LayoutEntry,
  RallyingFlareEntry,
  RangeEntry,
  SelfEffectEntry,
  StatusEffectEntry,
  SupportEffectEntry,
  TargetStressEntry,
  RemovalEntry,
} from "./types";

export type {
  BountyStatusRow,
  DamageEntry,
  CoreHigherSkillFlags,
  CoreHigherSkillRow,
  HeroAnnotationApplier,
  HeroAnnotationModule,
  LayoutEntry,
  RallyingFlareEntry,
  RangeEntry,
  SelfEffectEntry,
  StatusEffectEntry,
  SupportEffectEntry,
  TargetStressEntry,
  RemovalEntry,
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

/** 自身治疗 / 压力行。 */
export const SELF_EFFECTS: readonly SelfEffectEntry[] = [
  ...crusaderSelfEffects,
  ...vestalSelfEffects,
  ...jesterSelfEffects,
  ...plagueDoctorSelfEffects,
  ...abominationSelfEffects,
];

/** 目标压力行（目前只有 Jester 的 Inspiring Tune I–III）。 */
export const TARGET_STRESS: readonly TargetStressEntry[] = [...jesterTargetStress];

/** 条件移除行（Battlefield Medicine、Toxin Trickery）。 */
export const REMOVAL_ENTRIES: readonly RemovalEntry[] = [...REMOVAL_RULES];

/** 已复核支援效果行（当前只有 Crusader 的 Inspiring Cry I–III）。 */
export const SUPPORT_EFFECTS: readonly SupportEffectEntry[] = [...crusaderSupport];

/** Rallying Flare / Skeet Shot 逐卡行（Arbalest + Musketeer）。 */
export const RALLYING_FLARE_ENTRIES: readonly RallyingFlareEntry[] = [
  ...arbalestRallyingFlare,
  ...musketeerRallyingFlare,
];

/** 赏金猎人限定状态卡行。 */
export const BOUNTY_STATUS_ROWS: readonly BountyStatusRow[] = [...bountyStatusRows];

/** 逐卡效果框布局行。 */
export const LAYOUT_ENTRIES: readonly LayoutEntry[] = [
  ...hellionLayouts,
  ...bountyHunterLayouts,
  ...jesterLayouts,
  ...graveRobberLayouts,
];

/** 已复核条件伤害行。 */
export const DAMAGE_ENTRIES: readonly DamageEntry[] = [
  ...crusaderDamage,
  ...bountyHunterDamage,
  ...highwaymanDamage,
  ...vestalDamage,
  ...arbalestDamage,
  ...graveRobberDamage,
  ...occultistDamage,
  ...musketeerDamage,
];

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

export function applyHeroRallyingFlare(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyRallyingFlare(cards, RALLYING_FLARE_ENTRIES);
}

export function applyHeroBountyStatuses(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyBountyStatuses(cards, BOUNTY_STATUS_ROWS);
}

export function applyHeroLayouts(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyLayouts(cards, LAYOUT_ENTRIES);
}

export function applyHeroDamage(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyDamage(cards, DAMAGE_ENTRIES);
}
export function applyHeroSelfEffects(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applySelfEffects(cards, SELF_EFFECTS);
}
export function applyHeroTargetStress(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyTargetStress(cards, TARGET_STRESS);
}
export function applyHeroRemoval(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyRemoval(cards, REMOVAL_ENTRIES);
}
export function applyHeroTextRules(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyTextRules(cards, SHUFFLE_RULES, IGNORES_RULES);
}
