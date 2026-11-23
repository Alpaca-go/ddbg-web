import type { HeroName } from "../../hero-registry";
import type { NormalizedHeroSkillCard } from "../schema";

/**
 * 单个英雄的逐卡审校补丁。
 * 输入输出都是完整技能卡列表；实现里按 canonical ID 逐卡断言签名后再覆盖（R-048）。
 */
export type HeroAnnotationApplier = (
  cards: readonly NormalizedHeroSkillCard[],
) => NormalizedHeroSkillCard[];

/** 每个英雄一个模块，按固定编号 hNN 升序应用（docs/id-naming-rules.md §4）。 */
export type HeroAnnotationModule = {
  readonly id: `h${number}`;
  readonly hero: HeroName;
  readonly apply: HeroAnnotationApplier;
};

/** 高等级（II/III）逐卡注解里允许的卡片字段覆盖。 */
export type CoreHigherSkillFlags = Partial<
  Pick<
    NormalizedHeroSkillCard,
    | "verified_damage_bonus"
    | "verified_damage_bonuses"
    | "verified_status_effects"
    | "verified_range"
    | "verified_target_header"
  >
>;

/**
 * 一张高等级技能卡的审校记录。
 * `original` 是提取器给出的原始行，`lines` 是核对后的行；两者不一致时由 applier 重建该行。
 */
export type CoreHigherSkillRow = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly original: readonly string[];
  readonly lines: readonly string[];
  readonly flags: CoreHigherSkillFlags;
};
