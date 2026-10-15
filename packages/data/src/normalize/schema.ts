import { z } from "zod";
import { monsterEffectPlanSchema } from "../monster-effects";

import { iconStatusSchema } from "../dictionary/schema";
import { iconIdSchema, levelSchema, pageListSchema } from "../extract/common";
import { monsterStanceGroupsSchema } from "./monster-stance";

/** 可以拿来命名的只有 confirmed / confirmed_rulebook。decor 不是游戏图标。其余按 R-048 标未验证。 */
export const NAMINGS = ["confirmed", "confirmed_rulebook", "decor", "unverified"] as const;

export const namingSchema = z.enum(NAMINGS);

const UNVERIFIED_STATUSES = new Set(["needs_review", "unsure", "unreviewed"]);

/** 词典条目落到卡面上的结果。未收录的 iconId 也走这一结构，naming 为 unverified。 */
export const normalizedIconSchema = z
  .strictObject({
    iconId: iconIdSchema,
    in_dictionary: z.boolean(),
    status: iconStatusSchema.nullable(),
    key: z.string().nullable(),
    kind: z.string().nullable(),
    meaning_en: z.string().nullable(),
    meaning_zh: z.string().nullable(),
    value: z.int().nullable(),
    naming: namingSchema,
    /** 卡面限定的后续批准；不修改基础词典或其他卡的同形图标。 */
    approval: z.literal("R-056").optional(),
  })
  .superRefine((icon, ctx) => {
    if (!icon.in_dictionary) {
      if (
        icon.status !== null ||
        icon.key !== null ||
        icon.kind !== null ||
        icon.meaning_en !== null ||
        icon.meaning_zh !== null ||
        icon.value !== null ||
        icon.naming !== "unverified"
      ) {
        ctx.addIssue({
          code: "custom",
          message: "词典未收录的图标只保留 iconId，并标为未验证",
          path: ["naming"],
        });
      }
      return;
    }
    if (icon.status === null || icon.key === null || icon.kind === null) {
      ctx.addIssue({
        code: "custom",
        message: "词典内的图标要带上 status、key、kind",
        path: ["status"],
      });
      return;
    }
    if (icon.meaning_en === null || icon.meaning_zh === null) {
      ctx.addIssue({
        code: "custom",
        message: "词典内的图标要带上含义字段",
        path: ["meaning_en"],
      });
    }
    const expected =
      icon.status === "confirmed" || icon.status === "confirmed_rulebook" || icon.status === "decor"
        ? icon.status
        : "unverified";
    if (icon.naming !== expected) {
      ctx.addIssue({
        code: "custom",
        message: "naming 与 status 不一致",
        path: ["naming"],
      });
    }
    if (icon.key.startsWith("pending_") && icon.status !== "needs_review") {
      ctx.addIssue({
        code: "custom",
        message: "pending_ key 必须标为未验证",
        path: ["key"],
      });
    }
    if (UNVERIFIED_STATUSES.has(icon.status) && icon.naming !== "unverified") {
      ctx.addIssue({
        code: "custom",
        message: "needs_review / unsure / unreviewed 必须标为未验证",
        path: ["naming"],
      });
    }
  });

export type NormalizedIcon = z.infer<typeof normalizedIconSchema>;

export const textSegmentSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string().min(1),
});

export const iconSegmentSchema = z.strictObject({
  type: z.literal("icon"),
  icon: normalizedIconSchema,
});

export const segmentSchema = z.discriminatedUnion("type", [textSegmentSchema, iconSegmentSchema]);

export type Segment = z.infer<typeof segmentSchema>;

/** 印在 Crit / Acc 标签里的数字。标签文字是印刷出来的，旁边没有标签的数字不进这里。 */
export const printedLabelSchema = z.strictObject({
  label: z.enum(["Crit", "Acc"]),
  raw: z.string().min(1),
  value: z.int().nullable(),
});

/**
 * 没有标签的数字。`printed_label` 只说明它印在哪个标签旁边，不是这个数字的规则名。
 * `beside_icon` 是标签以外的数字，图标含义走词典，不另起 crit_value 这类字段名。
 */
export const normalizedUnlabeledNumberSchema = z.strictObject({
  text: z.string().min(1),
  numeric: z.int().nullable(),
  anchor: z.discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("printed_label"),
      label: z.enum(["Crit", "Acc"]),
    }),
    z.strictObject({
      type: z.literal("beside_icon"),
      left_icon: normalizedIconSchema.nullable(),
      inside_icon: normalizedIconSchema.nullable(),
    }),
  ]),
});

export const verificationSchema = z.strictObject({
  unverified: z.boolean(),
  reasons: z.array(z.string().min(1)),
});

const lineListSchema = z.array(z.array(segmentSchema));

const verifiedDamageBonusSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  amount: z.int().positive(),
  condition: z.enum(["marked", "unholy"]),
  source: z.literal("print_front"),
});

const skillStatFields = {
  printed_labels: z.array(printedLabelSchema),
  unlabeled_numbers: z.array(normalizedUnlabeledNumberSchema),
  effect_lines: lineListSchema,
  verified_damage_bonus: verifiedDamageBonusSchema.optional(),
  verified_target_support: z
    .strictObject({
      lineIndex: z.int().nonnegative(),
      heal: z.int().positive(),
      stress: z.int().negative(),
      light: z.int().positive(),
      source: z.literal("print_front"),
    })
    .optional(),
  verified_target_stress: z
    .strictObject({
      lineIndex: z.int().nonnegative(),
      amount: z.int().positive(),
      source: z.literal("print_front"),
    })
    .optional(),
};

/** 逐卡对照完整页面后附加的 Nt；缺失不表示任何默认持续时间。 */
export const verifiedStatusEffectSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  segmentIndex: z.int().nonnegative(),
  scope: z.enum(["self", "target"]),
  kind: z.enum([
    "bleed",
    "blight",
    "stun",
    "buff",
    "debuff",
    "mark",
    "guard",
    "riposte",
    "protection",
  ]),
  duration: z.int().positive(),
  amount: z.int().positive().optional(),
});

const heroSkillShared = {
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  level: levelSchema,
  ...skillStatFields,
  verified_status_effects: z.array(verifiedStatusEffectSchema).min(1).optional(),
  top_row_icons: z.array(normalizedIconSchema),
  name_row_icons: z.array(normalizedIconSchema),
  stats_line: z.array(segmentSchema).nullable(),
  verified_range: z
    .strictObject({
      min: z.int().nonnegative(),
      max: z.int().nonnegative(),
      source: z.literal("print_front"),
    })
    .refine((range) => range.min <= range.max)
    .optional(),
  front_icons: z.array(normalizedIconSchema),
  back_icons: z.array(normalizedIconSchema),
  issues: z.array(z.string()),
  verification: verificationSchema,
};

const standardHeroSkillSchema = z.strictObject({
  ...heroSkillShared,
  hero: z.string().min(1),
  back_name: z.string().min(1),
  back_level: levelSchema,
});

/** Abomination 变身卡。背面是另一张技能，名字可以和正面不同。 */
const doubleFacedHeroSkillSchema = z.strictObject({
  ...heroSkillShared,
  hero: z.null(),
  card_kind: z.literal("double_faced_skill"),
  back_face_skill: z.strictObject({
    name: z.string().min(1),
    level: levelSchema,
    lines: lineListSchema,
  }),
});

export const normalizedHeroSkillCardSchema = z.union([
  standardHeroSkillSchema,
  doubleFacedHeroSkillSchema,
]);

const normalizedMonsterSkillSchema = z.strictObject({
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  target: z.string().min(1).nullable(),
  ...skillStatFields,
  lines: lineListSchema,
  verified_monster_effects: monsterEffectPlanSchema.optional(),
});

const monsterShared = {
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  level: levelSchema,
  type_position_raw: z.string().min(1),
  type_position_tags: z.array(z.string().min(1)).min(1),
  copy_variants: z.array(
    z.strictObject({
      page: z.int().positive(),
      face: z.enum(["front", "back"]),
      icon: normalizedIconSchema,
    }),
  ),
  front_icons: z.array(normalizedIconSchema),
  back_icons: z.array(normalizedIconSchema),
  issues: z.array(z.string()),
  verification: verificationSchema,
};

const largeMonsterReferenceSchema = z.strictObject({
  ...monsterShared,
  card_kind: z.literal("large_monster_reference"),
  lines: lineListSchema,
});

/** `life` 是规则书 p.24 心形里的数字。parsed 层的字段名是 hp。 */
const monsterCardSchema = z
  .strictObject({
    ...monsterShared,
    life: z.int().positive(),
    life_icon: normalizedIconSchema,
    /** R24：仅接受另行核实的移动区域数；缺失不代表 0，不从图标自动补值。 */
    speed: z.int().nonnegative().optional(),
    /** R24 / R-083：仅具体获批卡的头部常驻Protection，非可消退状态堆。 */
    innateProtection: z.boolean().optional(),
    resistances: z.array(normalizedIconSchema),
    immunities: z.array(normalizedIconSchema),
    header_unlabeled_numbers: z.array(normalizedUnlabeledNumberSchema),
    skills: z.array(normalizedMonsterSkillSchema).min(1),
    footer_lines: lineListSchema,
    /** 缺失表示尚未核实；没有默认分组，不由原始行自动生成。 */
    stanceGroups: monsterStanceGroupsSchema.optional(),
    back_texts: lineListSchema,
  })
  .superRefine((card, ctx) => {
    for (const group of card.stanceGroups ?? []) {
      const slots = "skill" in group ? [group.skill] : group.rollTable.map((row) => row.skill);
      if (slots.some((slot) => card.skills.filter((skill) => skill.slot === slot).length !== 1))
        ctx.addIssue({
          code: "custom",
          message: "姿态选招必须引用卡上唯一存在的技能编号",
          path: ["stanceGroups"],
        });
    }
  });

export const normalizedMonsterMediumCardSchema = z.union([
  largeMonsterReferenceSchema,
  monsterCardSchema,
]);

export const normalizedMonsterLargeCardSchema = monsterCardSchema;

const trinketHalfSchema = z.strictObject({
  name: z.string().min(1),
  level: levelSchema,
  effect_lines: lineListSchema,
  printed_rotation: z.union([z.literal(0), z.literal(180)]),
});

export const normalizedTrinketCardSchema = z.strictObject({
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  level: levelSchema,
  back_level: levelSchema,
  upright_half: trinketHalfSchema,
  inverted_half: trinketHalfSchema,
  front_icons: z.array(normalizedIconSchema),
  back_icons: z.array(normalizedIconSchema),
  issues: z.array(z.string()),
  verification: verificationSchema,
});

const QUIRK_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_Quirks_FRONT.pdf";
const VIRTUE_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_FRONT.pdf";

export const verifiedResolveTriggerSchema = z.strictObject({
  rollMin: z.literal(1),
  rollMax: z.int().min(1).max(10),
  effect: z.discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("stress"),
      scope: z.enum(["self", "heroes"]),
      amount: z.int(),
    }),
    z.strictObject({
      type: z.literal("buff"),
      scope: z.enum(["self", "heroes"]),
      duration: z.int().positive(),
    }),
    z.strictObject({
      type: z.literal("heal"),
      scope: z.literal("self"),
      amount: z.int().positive(),
      perHeroLevel: z.literal(true),
    }),
    z.strictObject({ type: z.literal("consumeProvision"), amount: z.literal(1) }),
    z.strictObject({
      type: z.literal("wounds"),
      scope: z.literal("self"),
      amount: z.literal(2),
      perHeroLevel: z.literal(true),
    }),
    z.strictObject({
      type: z.literal("stanceMove"),
      forwardThrough: z.literal(5),
      distance: z.literal(1),
    }),
  ]),
});

export const normalizedQuirkCardSchema = z.strictObject({
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  /** 规则书 R26–R27 的正负表。卡面没有印这个词。对不上表就留空并标未验证。 */
  polarity: z.enum(["positive", "negative"]).nullable(),
  polarity_source: z.enum(["rulebook_r26_r27", "unverified"]),
  source_front: z.literal(QUIRK_FRONT),
  source_back: z.string().min(1),
  back_has_data: z.literal(false),
  lines: lineListSchema,
  icons: z.array(normalizedIconSchema),
  verification: verificationSchema,
});

export const normalizedVirtueAfflictionCardSchema = z
  .strictObject({
    id: z.string().min(1),
    pages: pageListSchema,
    copies: z.int().positive(),
    name: z.string().min(1),
    /**
     * R-053 的美德 / 折磨名单。卡面没有印 Virtue / Affliction。
     * 对不上名单就留空，原因是 role_not_printed。
     * 不按卡背箭头分组（rank 108、138、327 仍未决），也不因此给其余图标起名。
     */
    role: z.enum(["virtue", "affliction"]).nullable(),
    role_source: z.enum(["ruling_r053", "unverified"]),
    source_front: z.literal(VIRTUE_FRONT),
    source_back: z.string().min(1),
    back_has_data: z.literal(false),
    lines: lineListSchema,
    icons: z.array(normalizedIconSchema),
    verified_turn_start: verifiedResolveTriggerSchema.optional(),
    verification: verificationSchema,
  })
  .superRefine((card, ctx) => {
    const listed = card.role !== null;
    if (listed !== (card.role_source === "ruling_r053")) {
      ctx.addIssue({
        code: "custom",
        message: "role 与 role_source 不一致",
        path: ["role_source"],
      });
    }
    const emptyRole = card.verification.reasons.includes("role_not_printed");
    if (listed === emptyRole) {
      ctx.addIssue({
        code: "custom",
        message: listed
          ? "已有 role 时不再保留 role_not_printed"
          : "role 为空时必须保留 role_not_printed",
        path: ["verification", "reasons"],
      });
    }
    if (card.verification.unverified !== card.verification.reasons.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "unverified 由 reasons 决定，不能单独改",
        path: ["verification", "unverified"],
      });
    }
  });

const sourcePairSchema = z.strictObject({
  parsed: z.string().min(1).nullable(),
  raw: z.string().min(1),
  dictionary: z.literal("dictionary/icon-dictionary-v1.8.json"),
});

const statsSchema = z.strictObject({
  cards: z.int().nonnegative(),
  verified: z.int().nonnegative(),
  unverified: z.int().nonnegative(),
});

function normalizedFileSchema<T extends z.ZodType>(category: string, cardSchema: T) {
  return z
    .strictObject({
      schema: z.literal("ddbg-normalized-v0"),
      dictionary_version: z.literal("1.8"),
      category: z.literal(category),
      sources: sourcePairSchema,
      stats: statsSchema,
      cards: z.array(cardSchema),
    })
    .superRefine((file, ctx) => {
      const cards = file.cards as { verification: { unverified: boolean } }[];
      const unverified = cards.filter((card) => card.verification.unverified).length;
      if (file.stats.cards !== file.cards.length) {
        ctx.addIssue({
          code: "custom",
          message: "stats.cards 与 cards.length 不一致",
          path: ["stats"],
        });
      }
      if (
        file.stats.unverified !== unverified ||
        file.stats.verified !== file.cards.length - unverified
      ) {
        ctx.addIssue({
          code: "custom",
          message: "stats 的已验证 / 未验证计数不一致",
          path: ["stats"],
        });
      }
    });
}

export const normalizedHeroSkillFileSchema = normalizedFileSchema(
  "hero_skill",
  normalizedHeroSkillCardSchema,
);
export const normalizedMonsterMediumFileSchema = normalizedFileSchema(
  "monster_medium",
  normalizedMonsterMediumCardSchema,
);
export const normalizedMonsterLargeFileSchema = normalizedFileSchema(
  "monster_large",
  normalizedMonsterLargeCardSchema,
);
export const normalizedTrinketFileSchema = normalizedFileSchema(
  "trinket",
  normalizedTrinketCardSchema,
);
export const normalizedQuirkFileSchema = normalizedFileSchema("quirk", normalizedQuirkCardSchema);
export const normalizedVirtueAfflictionFileSchema = normalizedFileSchema(
  "virtue_affliction",
  normalizedVirtueAfflictionCardSchema,
);

export type NormalizedHeroSkillCard = z.infer<typeof normalizedHeroSkillCardSchema>;
export type NormalizedHeroSkillFile = z.infer<typeof normalizedHeroSkillFileSchema>;
export type NormalizedMonsterMediumCard = z.infer<typeof normalizedMonsterMediumCardSchema>;
export type NormalizedMonsterMediumFile = z.infer<typeof normalizedMonsterMediumFileSchema>;
export type NormalizedMonsterLargeCard = z.infer<typeof normalizedMonsterLargeCardSchema>;
export type NormalizedMonsterLargeFile = z.infer<typeof normalizedMonsterLargeFileSchema>;
export type NormalizedTrinketCard = z.infer<typeof normalizedTrinketCardSchema>;
export type NormalizedTrinketFile = z.infer<typeof normalizedTrinketFileSchema>;
export type NormalizedQuirkCard = z.infer<typeof normalizedQuirkCardSchema>;
export type NormalizedQuirkFile = z.infer<typeof normalizedQuirkFileSchema>;
export type NormalizedVirtueAfflictionCard = z.infer<typeof normalizedVirtueAfflictionCardSchema>;
export type NormalizedVirtueAfflictionFile = z.infer<typeof normalizedVirtueAfflictionFileSchema>;
