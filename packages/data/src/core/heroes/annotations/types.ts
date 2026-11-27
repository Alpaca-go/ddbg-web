import type { DirectAttack } from "../../../shared/effects";
import type { HERO_PRINT_SOURCES } from "./print-sources";
import type { HeroName } from "../hero-registry";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";

/**
 * 单个英雄的逐卡审校补丁。
 * 输入输出都是完整技能卡列表；实现里按 canonical ID 逐卡断言签名后再覆盖（R-048）。
 */
export type HeroAnnotationApplier = (
  cards: readonly NormalizedHeroSkillCard[],
) => NormalizedHeroSkillCard[];

export type DirectAttackEntry = Omit<DirectAttack, "damageBonus" | "selfShuffle"> & {
  readonly id: string;
};
export type DirectAttackFace = Pick<DirectAttackEntry, "stances" | "range" | "monsterTargets">;

/** 一个英雄的全部逐卡注解数据。只写该英雄实际有的表，没有就不写。 */
export type HeroAnnotationEntries = {
  readonly directAttack?: readonly DirectAttackEntry[];
  readonly status?: readonly StatusEffectEntry[];
  readonly range?: readonly RangeEntry[];
  readonly support?: readonly SupportEffectEntry[];
  readonly damage?: readonly DamageEntry[];
  readonly self?: readonly SelfEffectEntry[];
  readonly targetStress?: readonly TargetStressEntry[];
  readonly layout?: readonly LayoutEntry[];
  readonly bounty?: readonly BountyStatusRow[];
  readonly rallyingFlare?: readonly RallyingFlareEntry[];
  readonly shuffle?: readonly ShuffleEntry[];
  readonly ignores?: readonly IgnoresEntry[];
  readonly removal?: readonly RemovalEntry[];
  readonly higher?: readonly CoreHigherSkillRow[];
  readonly targetCount?: readonly TargetCountEntry[];
  readonly effectKind?: readonly EffectKindEntry[];
};

/** 每个英雄一个模块，按固定编号 hNN 升序应用（docs/id-naming-rules.md §4）。 */
export type HeroAnnotationModule = {
  readonly id: `h${number}`;
  readonly hero: HeroName;
  readonly entries: HeroAnnotationEntries;
  readonly apply: HeroAnnotationApplier;
};

/** 高等级（II/III）逐卡注解里允许的卡片字段覆盖。 */
export type CoreHigherSkillFlags = Partial<
  Pick<
    NormalizedHeroSkillCard,
    | "annotation_damage_bonus"
    | "annotation_damage_bonuses"
    | "annotation_status_effects"
    | "annotation_range"
    | "annotation_target_header"
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
/** Rallying Flare / Skeet Shot 逐卡复核行（R-103）。 */
export type RallyingFlareEntry = {
  readonly id: string;
  readonly hero: "ARBALEST" | "MUSKETEER";
  readonly name: string;
  readonly level: number;
  readonly acc: number;
  readonly targetIcons: number;
};

/** 赏金猎人限定状态卡行：目标框图标逐卡改为 debuff（R-089）。 */
export type BountyStatusRow = {
  readonly id: string;
  readonly name: string;
  readonly page: number;
  readonly level: number;
  readonly lines: readonly string[];
  readonly stats: string;
  readonly labels: readonly (readonly [string, number])[];
  readonly effects: readonly {
    readonly scope: "self" | "target";
    readonly kind: "mark" | "debuff" | "buff" | "bleed";
    readonly duration: number;
    readonly amount?: number;
    readonly lineIndex: number;
  }[];
};
/** 逐卡效果框布局：整理已核实的跨行框，不改原始转录（R-048）。 */
export type LayoutEntry =
  | {
      readonly kind: "strip-trailing-comma";
      readonly id: string;
      readonly name: string;
      readonly level: number;
      readonly expected: readonly [string, string];
    }
  | {
      readonly kind: "target-box";
      readonly id: string;
      readonly hero: HeroName;
      readonly name: string;
      readonly page: number;
      readonly first: string;
      readonly second: readonly [string, string];
      readonly label: string;
    }
  | {
      readonly kind: "rebuild-lines";
      readonly id: string;
      readonly name: string;
      readonly level: number;
      readonly page: number;
      readonly expected: readonly string[];
      readonly output: readonly [string, string];
    };
export type CorrectionIcon =
  | {
      readonly line: number | "stats";
      readonly segment: number;
      readonly expectKey: string;
      readonly variantRank?: number;
      readonly relabelAs?: string;
    }
  | { readonly icon: string; readonly relabelAs?: string }
  | { readonly sourceIcon: keyof typeof HERO_PRINT_SOURCES; readonly relabelAs?: string }
  | {
      readonly iconId: string;
      readonly from?: "lines" | "effects";
      readonly relabelAs?: string;
    }
  | {
      readonly line: number | "stats";
      readonly segment: number;
      readonly iconId: string;
      readonly relabelAs?: string;
    };

type CorrectionLine = readonly (string | CorrectionIcon)[];

type NumberAnchor = {
  readonly text: string;
  readonly numeric: number | null;
  readonly left?: CorrectionIcon;
  readonly inside?: CorrectionIcon;
};

type NumberMatch = {
  readonly text?: string;
  readonly numeric?: number;
  readonly beside?: true;
  readonly leftKeys?: readonly string[];
  readonly insideId?: string | null;
};

export type NumberCorrection = {
  readonly prepend?: readonly NumberAnchor[];
  readonly append?: readonly NumberAnchor[];
  readonly remove?: readonly NumberMatch[];
  readonly replaceLeft?: { readonly text: string; readonly icon: CorrectionIcon };
};

/** 核对印刷输入后，仅覆盖列出的技能卡字段（R-048）。 */
export type SkillCorrection = {
  readonly id: string;
  readonly name: string;
  readonly page: number;
  readonly level: number;
  readonly expectedEffects: readonly string[];
  readonly expectedStats: string | null;
  readonly expectedLabels?: NormalizedHeroSkillCard["printed_labels"];
  readonly requireIcons?: readonly CorrectionIcon[];
  readonly effects?: readonly (CorrectionLine | number)[];
  readonly stats?: CorrectionLine | null;
  readonly numbers?: NumberCorrection;
  readonly annotations?: Pick<
    NormalizedHeroSkillCard,
    Extract<keyof NormalizedHeroSkillCard, `annotation_${string}`>
  >;
};

/** 已复核条件伤害：只录已命名 damage 图标与明文条件。 */
export type DamageEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly page: number;
  readonly lineIndex: number;
  readonly amount: number;
  readonly condition: "marked" | "unholy" | "stunned" | "blighted" | "eldritch";
  readonly suffix: string;
};
/** 自身治疗 / 压力行：lineIndex 指向含 self_effects + heal/stress 的那一行。 */
export type SelfEffectEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly lineIndex: number;
  readonly kind: "heal" | "stress";
  readonly amount: number;
};
/** 目标压力行：lineIndex 指向含 target_effects + stress 的那一行。 */
export type TargetStressEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly lineIndex: number;
  readonly amount: number;
};
/** 文本位移规则：scope 来自印刷作用侧，text 保留「Push N / Pull N」原文。 */
export type ShuffleEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly lineIndex: number;
  readonly scope: "self" | "target";
  readonly text: string;
};

/** Ignores Protection / Guard 的逐行规则。 */
export type IgnoresEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly lineIndex: number;
  readonly kind: "protection" | "guard";
};

/** Remove Bleed / Blight 的逐行规则；scope 由卡面标记或同框配对行决定。 */
export type RemovalEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly lineIndex: number;
  readonly scope: "self" | "target";
  readonly kinds: readonly ("bleed" | "blight")[];
};

/** stats 行主效果（damage / heal）；无主效果的卡不写。 */
export type EffectKind = "damage" | "heal";
export type EffectKindEntry = { readonly id: string; readonly effect: EffectKind };

/** 区域目标数：stats 行或卡面正面的已命名目标图标个数。 */
export type TargetCountEntry = {
  readonly id: string;
  readonly hero: number;
  readonly monster: number;
  readonly heroOrMonster: number;
};

/** Abomination 投影后的一面：行、字段与必要结构转换。 */
export type AbominationProjectionFace = {
  readonly lines?: readonly string[];
  readonly statsLine?: null;
  readonly printedLabels?: readonly [];
  readonly topIcons?: readonly (string | null)[];
  readonly statuses?: readonly {
    readonly lineIndex: number;
    readonly segmentIndex: number;
    readonly scope: "self" | "target";
    readonly kind:
      "bleed" | "blight" | "stun" | "buff" | "debuff" | "mark" | "guard" | "riposte" | "protection";
    readonly duration: number;
    readonly amount?: number;
  }[];
  readonly selfStress?: { readonly lineIndex: number; readonly amount: number };
  readonly selfHeal?: { readonly lineIndex: number; readonly amount: number };
  readonly selfRange?: true;
  readonly alliesStress?: number;
  readonly requiredForm?: "human" | "beast";
};

export type AbominationProjectionRow = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly front: AbominationProjectionFace;
  readonly back?: AbominationProjectionFace;
};
