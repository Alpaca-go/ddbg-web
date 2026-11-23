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

/** 状态效果注解行：一张卡的一行印刷文字对应哪些状态效果。 */
export type StatusEffectEntry = {
  readonly id: string;
  readonly hero?: HeroName;
  readonly name: string;
  readonly level: number;
  readonly lineIndex: number;
  readonly scope: "self" | "target";
  readonly signature: string;
  readonly headerSignature?: string;
  readonly scopeLine?: { readonly index: number; readonly signature: string };
  readonly effects: readonly {
    readonly kind:
      "bleed" | "blight" | "stun" | "buff" | "mark" | "riposte" | "protection" | "guard" | "debuff";
    readonly duration: number;
    readonly amount?: number;
  }[];
};

/** 已复核的印刷区间：卡面 range 图标旁印出的明确数字。 */
export type RangeEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly min: number;
  readonly max: number;
};

/** 已复核的支援效果：目标行 + 效果行上的治疗 / 压力 / 光照数字。 */
export type SupportEffectEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly page: number;
  readonly lineIndex: number;
  readonly targetSignature: string;
  readonly effectSignature: string;
  readonly effects: {
    readonly heal: number;
    readonly stress: number;
    readonly light: number;
  };
};
