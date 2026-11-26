import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import { h01 } from "./h01-crusader";
import { h02 } from "./h02-hellion";
import { h03 } from "./h03-bounty-hunter";
import { h04 } from "./h04-highwayman";
import { h05 } from "./h05-vestal";
import { h06 } from "./h06-jester";
import { h07 } from "./h07-plague-doctor";
import { h08 } from "./h08-arbalest";
import { h09 } from "./h09-grave-robber";
import { h10 } from "./h10-occultist";
import { h11 } from "./h11-abomination";
import { h12 } from "./h12-man-at-arms";
import { h13 } from "./h13-flagellant";
import { h14 } from "./h14-leper";
import { h15 } from "./h15-antiquarian";
import { h16 } from "./h16-shieldbreaker";
import { h17 } from "./h17-houndmaster";
import { h18 } from "./h18-musketeer";
import { applyBountyStatuses } from "./bounty-statuses";
import { applyDamage } from "./damage";
import { applyEffectKind } from "./effect-kind";
import { applyLayouts } from "./layout";
import { applyRallyingFlare } from "./rallying-flare";
import { applyRemoval } from "./removal";
import { applySelfEffects } from "./self-effects";
import { applyTargetCounts } from "./target-counts";
import { applyTargetStress } from "./target-stress";
import { applyTextRules } from "./text-rules";
import { applyRangeEntries } from "./ranges";
import { applyStatusEffects } from "./status-effects";
import { applySupportEffects } from "./support-effects";
import type { HeroAnnotationEntries, HeroAnnotationModule } from "./types";

export type {
  BountyStatusRow,
  DamageEntry,
  CoreHigherSkillFlags,
  CoreHigherSkillRow,
  EffectKind,
  EffectKindEntry,
  HeroAnnotationApplier,
  HeroAnnotationEntries,
  HeroAnnotationModule,
  LayoutEntry,
  RallyingFlareEntry,
  RangeEntry,
  SelfEffectEntry,
  StatusEffectEntry,
  SupportEffectEntry,
  TargetStressEntry,
  RemovalEntry,
  TargetCountEntry,
} from "./types";

/** 18 名英雄的注解模块，按 hNN 升序应用。数据型模块的 apply 是 no-op。 */
export const HERO_ANNOTATIONS: readonly HeroAnnotationModule[] = [
  h01,
  h02,
  h03,
  h04,
  h05,
  h06,
  h07,
  h08,
  h09,
  h10,
  h11,
  h12,
  h13,
  h14,
  h15,
  h16,
  h17,
  h18,
];

type EntryOf<K extends keyof HeroAnnotationEntries> = NonNullable<HeroAnnotationEntries[K]>[number];

const entriesOf = <K extends keyof HeroAnnotationEntries>(key: K): EntryOf<K>[] =>
  HERO_ANNOTATIONS.flatMap((module) => (module.entries[key] ?? []) as readonly EntryOf<K>[]);

/**
 * 核心盒 II/III 级逐卡注解，按 hNN 拼接。
 * 同一张卡只会出现在一个英雄文件里，顺序不影响 `core-higher-skills` 的按 id 查找。
 */
export const CORE_HIGHER_SKILL_ROWS = entriesOf("higher");

/**
 * 状态效果注解行，按 hNN 拼接。
 * 同一张卡的多行保持在同一份英雄文件里的原顺序，跨英雄顺序不影响结果。
 */
export const STATUS_EFFECTS = entriesOf("status");

/** 已复核印刷区间行，按 hNN 拼接。 */
export const RANGES = entriesOf("range");

/** 自身治疗 / 压力行。 */
export const SELF_EFFECTS = entriesOf("self");

/** 目标压力行（目前只有 Jester 的 Inspiring Tune I–III）。 */
export const TARGET_STRESS = entriesOf("targetStress");

/** 条件移除行（Battlefield Medicine、Toxin Trickery）。 */
export const REMOVAL_ENTRIES = entriesOf("removal");

/** 18 名英雄的区域目标数（A2 单元 3）。 */
export const TARGET_COUNT_ENTRIES = entriesOf("targetCount");

/** 18 名英雄 stats 行的主效果（A2 单元 4a）。 */
export const EFFECT_KIND_ENTRIES = entriesOf("effectKind");

/** 已复核支援效果行（当前只有 Crusader 的 Inspiring Cry I–III）。 */
export const SUPPORT_EFFECTS = entriesOf("support");

/** Rallying Flare / Skeet Shot 逐卡行（Arbalest + Musketeer）。 */
export const RALLYING_FLARE_ENTRIES = entriesOf("rallyingFlare");

/** 赏金猎人限定状态卡行。 */
export const BOUNTY_STATUS_ROWS = entriesOf("bounty");

/** 逐卡效果框布局行。 */
export const LAYOUT_ENTRIES = entriesOf("layout");

/** 已复核条件伤害行。 */
export const DAMAGE_ENTRIES = entriesOf("damage");

/** 文本位移规则。 */
export const SHUFFLE_ENTRIES = entriesOf("shuffle");

/** Ignores Protection / Guard 规则。 */
export const IGNORES_ENTRIES = entriesOf("ignores");

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
export function applyHeroTargetCounts(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyTargetCounts(cards, TARGET_COUNT_ENTRIES);
}
export function applyHeroEffectKind(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyEffectKind(cards, EFFECT_KIND_ENTRIES);
}
export function applyHeroTextRules(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return applyTextRules(cards, SHUFFLE_ENTRIES, IGNORES_ENTRIES);
}
