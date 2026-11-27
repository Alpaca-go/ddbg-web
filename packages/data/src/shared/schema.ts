import { z } from "zod";
import { HERO_SKILL_BASE, heroSkillId, isHeroName } from "../core/heroes/hero-registry";
import { heroSkillSourcesSchema } from "../core/heroes/hero-sources";
import { CONTENT_PACK_IDS, isCoreMonsterSupplementId } from "./content-packs";
import { monsterEffectPlanSchema } from "../core/monsters/monster-effects";
import {
  wealdMonsterAttackSchema,
  wealdMonsterProfileSchema,
} from "../weald/monsters/monster-rulings";

import { iconStatusSchema } from "./dictionary/schema";
import { iconIdSchema, levelSchema, pageListSchema } from "./extract/common";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { STATUS_KINDS } from "./status-kinds";
import { conditionalDamageSchema, directAttackSchema } from "./effects";

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

const damageBonusRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  ...conditionalDamageSchema.shape,
  source: z.literal("print_front"),
});

const targetHeaderRuleSchema = z.strictObject({
  lineIndex: z.literal(0),
  source: z.literal("print_front"),
});

const targetSupportRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  heal: z.int().positive(),
  stress: z.int().negative(),
  light: z.int().positive(),
  source: z.literal("print_front"),
});

const targetStressRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  amount: z.int().refine((amount) => amount !== 0),
  source: z.literal("print_front"),
});

const targetHealRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  amount: z.int().positive(),
  source: z.literal("print_front"),
});

const effectLineReceiptRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  signature: z.string().min(1),
  source: z.literal("print_front"),
});

const selfHealRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  amount: z.int().positive(),
  source: z.literal("print_front"),
});

const selfStressRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  amount: z.int(),
  source: z.literal("print_front"),
});

const actorDamageRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  amount: z.int().positive(),
  source: z.literal("print_front"),
});

const transferRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  signature: z.string().min(1),
  source: z.literal("print_front"),
});

const rangeRuleSchema = z
  .strictObject({
    min: z.int().nonnegative(),
    max: z.int().nonnegative(),
    source: z.literal("print_front"),
  })
  .refine((range) => range.min <= range.max);

const rallyingFlareRuleSchema = z.strictObject({
  cleanupLineIndex: z.literal(0),
  cleanupSignature: z.string().min(1),
  monsterDebuffLineIndex: z.literal(1),
  monsterDebuffSignature: z.string().min(1),
  debuffDuration: z.int().positive(),
  source: z.literal("print_front"),
});

const skillStatFields = {
  printed_labels: z.array(printedLabelSchema),
  unlabeled_numbers: z.array(normalizedUnlabeledNumberSchema),
  effect_lines: lineListSchema,
};

/** 状态种类；抗性 / 免疫规则共用同一枚举。 */
export const statusKindSchema = z.enum(STATUS_KINDS);
export type StatusKindValue = z.infer<typeof statusKindSchema>;

/** 逐卡对照完整页面后附加的 Nt；缺失不表示任何默认持续时间。 */
const statusEffectRuleSchema = z.strictObject({
  lineIndex: z.int().nonnegative(),
  scopeLineIndex: z.int().nonnegative().optional(),
  segmentIndex: z.int().nonnegative(),
  scope: z.enum(["self", "target"]),
  kind: statusKindSchema,
  duration: z.int().positive(),
  amount: z.int().positive().optional(),
});

const selfRulesSchema = z
  .strictObject({
    range: z.literal(true).optional(),
    heal: selfHealRuleSchema.optional(),
    stress: selfStressRuleSchema.optional(),
  })
  .optional();

const targetRulesSchema = z
  .strictObject({
    header: targetHeaderRuleSchema.optional(),
    heal: targetHealRuleSchema.optional(),
    stress: targetStressRuleSchema.optional(),
    support: targetSupportRuleSchema.optional(),
  })
  .optional();

/** hero_skill 与 monster_skill 共用的规则字段（不含类别专属项）。 */
const skillRulesCoreShape = {
  damage: damageBonusRuleSchema.optional(),
  actorDamage: actorDamageRuleSchema.optional(),
  receipts: z.array(effectLineReceiptRuleSchema).min(1).optional(),
  transfer: transferRuleSchema.optional(),
  alliesStress: z.int().optional(),
  self: selfRulesSchema,
  target: targetRulesSchema,
};

/** 英雄技能规则：只放引擎要执行的解释，不放印刷原文。 */
export const heroSkillRulesSchema = z.strictObject({
  ...skillRulesCoreShape,
  directAttack: directAttackSchema.optional(),
  statuses: z.array(statusEffectRuleSchema).min(1).optional(),
  damageBonuses: z
    .array(damageBonusRuleSchema)
    .min(2)
    .refine((bonuses) => new Set(bonuses.map((b) => b.lineIndex)).size === bonuses.length)
    .optional(),
  range: rangeRuleSchema.optional(),
  rallyingFlare: rallyingFlareRuleSchema.optional(),
  shuffle: z
    .array(
      z.strictObject({
        lineIndex: z.int().nonnegative(),
        scope: z.enum(["self", "target"]),
        text: z.string().min(1),
      }),
    )
    .min(1)
    .optional(),
  ignores: z
    .array(
      z.strictObject({
        lineIndex: z.int().nonnegative(),
        kind: z.enum(["protection", "guard"]),
      }),
    )
    .min(1)
    .optional(),
  removal: z
    .array(
      z.strictObject({
        lineIndex: z.int().nonnegative(),
        scope: z.enum(["self", "target"]),
        kinds: z
          .array(z.enum(["bleed", "blight"]))
          .length(2)
          .refine((kinds) => new Set(kinds).size === kinds.length, "移除状态种类不得重复"),
      }),
    )
    .min(1)
    .optional(),
  /** 已核实的区域目标数（规则书第 19 页）；0/0/0 表示没有目标图标。 */
  targets: z
    .strictObject({
      hero: z.int().nonnegative(),
      monster: z.int().nonnegative(),
      heroOrMonster: z.int().nonnegative(),
    })
    .optional(),
  /** stats 行的主效果；只有 damage / heal 两种已命名图标。 */
  effect: z.enum(["damage", "heal"]).optional(),
});

/** 怪物技能规则：与英雄共用核心字段，另有怪物效果计划。 */
export const monsterSkillRulesSchema = z.strictObject({
  ...skillRulesCoreShape,
  range: rangeRuleSchema.optional(),
  effects: monsterEffectPlanSchema.optional(),
  wealdAttack: wealdMonsterAttackSchema.optional(),
});

/** 怪物卡级规则（技能级规则在各 skill.rules）。 */
export const monsterCardRulesSchema = z.strictObject({
  wealdProfile: wealdMonsterProfileSchema.optional(),
  /** 已核实的抗性 / 免疫状态种类；空数组表示该栏没有任何图标。 */
  resistances: z
    .array(statusKindSchema)
    .refine((kinds) => new Set(kinds).size === kinds.length, "抗性种类不得重复")
    .optional(),
  immunities: z
    .array(statusKindSchema)
    .refine((kinds) => new Set(kinds).size === kinds.length, "免疫种类不得重复")
    .optional(),
  /** Shuffle 抗性 / 免疫是即时位移防御，不是持久状态堆。 */
  shuffleResist: z.boolean().optional(),
  shuffleImmune: z.boolean().optional(),
});

const heroSkillShared = {
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  level: levelSchema,
  /** v1.1 英雄 SKILL 的物理来源；旧数据可缺省。 */
  source: z.strictObject({ file: z.string().min(1), page: z.int().positive() }).optional(),
  ...skillStatFields,
  top_row_icons: z.array(normalizedIconSchema),
  name_row_icons: z.array(normalizedIconSchema),
  stats_line: z.array(segmentSchema).nullable(),
  /** 规则语义（新命名空间）：只放引擎要执行的解释，不放印刷原文。 */
  rules: heroSkillRulesSchema.optional(),
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
  /** 规则语义（新命名空间）：只放引擎要执行的解释，不放印刷原文。 */
  rules: monsterSkillRulesSchema.optional(),
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
    /** 规则语义（新命名空间）：只放引擎要执行的解释，不放印刷原文。 */
    rules: monsterCardRulesSchema.optional(),
    /** R-230：逐卡确认的 Dodge；不覆盖原始图标旁数字。 */
    dodge: z.int().nonnegative().optional(),
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
      const slots =
        "unavailable" in group
          ? []
          : "skill" in group
            ? [group.skill]
            : group.rollTable.map((row) => row.skill);
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
  /** 已核实的独立使用效果；缺失表示这张饰品没有独立使用能力。 */
  rules: z
    .strictObject({
      useStress: z.literal(1).optional(),
    })
    .optional(),
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

/** 美德 / 折磨的规则语义。 */
export const virtueRulesSchema = z.strictObject({
  turnStart: verifiedResolveTriggerSchema.optional(),
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
    /** 规则语义（新命名空间）：只放引擎要执行的解释，不放印刷原文。 */
    rules: virtueRulesSchema.optional(),
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

function normalizedFileSchema<
  T extends z.ZodType,
  S extends typeof sourcePairSchema | typeof heroSkillSourcesSchema,
>(category: string, cardSchema: T, sourcesSchema: S) {
  return z
    .strictObject({
      schema: z.literal("ddbg-normalized-v0"),
      dictionary_version: z.literal("1.8"),
      category: z.literal(category),
      sources: sourcesSchema,
      stats: statsSchema,
      cards: z.array(cardSchema),
    })
    .superRefine((file, ctx) => {
      const cards = file.cards as { id: string; verification: { unverified: boolean } }[];
      if (new Set(cards.map((card) => card.id)).size !== cards.length)
        ctx.addIssue({ code: "custom", message: "目录内的卡牌 ID 重复", path: ["cards"] });
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
  heroSkillSourcesSchema,
);
/** 构建前段仍按 raw ID 校对印刷，发布目录在构建末尾和读取时验证 canonical ID。 */
export const canonicalHeroSkillFileSchema = normalizedHeroSkillFileSchema.superRefine(
  (file, ctx) => {
    for (const [index, card] of file.cards.entries()) {
      const hero = card.hero ?? "ABOMINATION";
      const printedPage = card.pages[0]!;
      const catalogPage =
        hero === "MUSKETEER" ? HERO_SKILL_BASE.MUSKETEER + printedPage - 1 : printedPage;
      if (
        !isHeroName(hero) ||
        card.pages.length !== 1 ||
        card.source?.page !== printedPage ||
        catalogPage < HERO_SKILL_BASE[hero] ||
        catalogPage > HERO_SKILL_BASE[hero] + 20 ||
        card.id !== heroSkillId(hero, catalogPage)
      )
        ctx.addIssue({
          code: "custom",
          path: ["cards", index, "id"],
          message: "英雄技能 ID、英雄或印刷页不符",
        });
    }
  },
);

function pagedCardSchema<T extends z.ZodType<{ id: string; pages: number[] }>>(
  cardSchema: T,
  category: string,
  extensions = false,
) {
  return cardSchema.refine(
    (card) => {
      const firstPage = card.pages[0]!;
      if (firstPage > 999) return false;
      const page = `p${String(firstPage).padStart(3, "0")}`;
      if (card.id === `${category}:${page}`) return true;
      if (!extensions) return false;
      if (
        category === "monster_medium" &&
        isCoreMonsterSupplementId(card.id) &&
        card.id.endsWith(`:${page}`)
      )
        return true;
      return CONTENT_PACK_IDS.some(
        (pack) => pack !== "core" && card.id === `${category}:${pack}:${page}`,
      );
    },
    { path: ["id"], message: "卡牌 ID 与类别、印刷首页或内容包不一致" },
  );
}

function normalizedMonsterFileSchema<T extends z.ZodType<{ id: string; pages: number[] }>>(
  category: "monster_medium" | "monster_large",
  cardSchema: T,
) {
  return normalizedFileSchema(
    category,
    pagedCardSchema(cardSchema, category, true),
    sourcePairSchema,
  ).superRefine((file, ctx) => {
    const folder = CONTENT_PACK_IDS.find(
      (pack) => pack !== "core" && file.sources.raw.startsWith(`extract/extension/${pack}/raw/`),
    );
    const matchesSource = (id: string) =>
      folder
        ? id.startsWith(`${category}:${folder}:`)
        : id.startsWith(`${category}:p`) || isCoreMonsterSupplementId(id);
    if (file.cards.some((card) => !matchesSource(card.id)))
      ctx.addIssue({ code: "custom", message: "怪物 ID 与目录来源包不一致", path: ["cards"] });
  });
}

export const normalizedMonsterMediumFileSchema = normalizedMonsterFileSchema(
  "monster_medium",
  normalizedMonsterMediumCardSchema,
);
export const normalizedMonsterLargeFileSchema = normalizedMonsterFileSchema(
  "monster_large",
  normalizedMonsterLargeCardSchema,
);
export const normalizedTrinketFileSchema = normalizedFileSchema(
  "trinket",
  pagedCardSchema(normalizedTrinketCardSchema, "trinket"),
  sourcePairSchema,
);
export const normalizedQuirkFileSchema = normalizedFileSchema(
  "quirk",
  pagedCardSchema(normalizedQuirkCardSchema, "quirk"),
  sourcePairSchema,
);
export const normalizedVirtueAfflictionFileSchema = normalizedFileSchema(
  "virtue_affliction",
  pagedCardSchema(normalizedVirtueAfflictionCardSchema, "virtue_affliction"),
  sourcePairSchema,
);

type NormalizedHeroSkillCardBase = z.infer<typeof normalizedHeroSkillCardSchema>;
type HeroSkillRules = NonNullable<NormalizedHeroSkillCardBase["rules"]>;
type HeroSkillSelfRules = NonNullable<HeroSkillRules["self"]>;
type HeroSkillTargetRules = NonNullable<HeroSkillRules["target"]>;

/**
 * 注解层内部形状：schema 只落 `rules`，但 applier 仍先用旧字段做中间产物，
 * 由 build 的 `withRules` 在写盘前剥离。类型只用于 data 内部，不进入 normalized。
 */
export type NormalizedHeroSkillCard = NormalizedHeroSkillCardBase & {
  annotation_status_effects?: HeroSkillRules["statuses"];
  annotation_damage_bonus?: HeroSkillRules["damage"];
  annotation_damage_bonuses?: HeroSkillRules["damageBonuses"];
  annotation_actor_damage_bonus?: HeroSkillRules["actorDamage"];
  annotation_range?: HeroSkillRules["range"];
  annotation_self_range?: HeroSkillSelfRules["range"];
  annotation_self_heal?: HeroSkillSelfRules["heal"];
  annotation_self_stress?: HeroSkillSelfRules["stress"];
  annotation_target_header?: HeroSkillTargetRules["header"];
  annotation_target_heal?: HeroSkillTargetRules["heal"];
  annotation_target_stress?: HeroSkillTargetRules["stress"];
  annotation_target_support?: HeroSkillTargetRules["support"];
  annotation_allies_stress?: HeroSkillRules["alliesStress"];
  annotation_rallying_flare?: HeroSkillRules["rallyingFlare"];
  annotation_effect_line_receipts?: HeroSkillRules["receipts"];
  annotation_bleed_blight_transfer?: HeroSkillRules["transfer"];
};

/** applier 输出解析：把内部旧字段就地折成 rules，schema 只校验 rules 形状。 */
export function parseAnnotatedHeroSkillCard(input: unknown): NormalizedHeroSkillCard {
  const raw = input as Record<string, unknown>;
  const annotations = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key.startsWith("annotation_")),
  );
  const rest = Object.fromEntries(
    Object.entries(raw).filter(([key]) => !key.startsWith("annotation_")),
  );
  const parsed = normalizedHeroSkillCardSchema.parse(rest);
  const rules = { ...(parsed.rules ?? {}) } as Record<string, unknown>;
  const a = annotations as Record<string, unknown>;
  const map: Record<string, string> = {
    annotation_status_effects: "statuses",
    annotation_damage_bonus: "damage",
    annotation_damage_bonuses: "damageBonuses",
    annotation_actor_damage_bonus: "actorDamage",
    annotation_range: "range",
    annotation_allies_stress: "alliesStress",
    annotation_rallying_flare: "rallyingFlare",
    annotation_effect_line_receipts: "receipts",
    annotation_bleed_blight_transfer: "transfer",
  };
  for (const [from, to] of Object.entries(map)) {
    if (a[from] !== undefined) rules[to] = a[from];
  }
  const self = { ...((rules.self as Record<string, unknown>) ?? {}) };
  if (a.annotation_self_range !== undefined) self.range = a.annotation_self_range;
  if (a.annotation_self_heal !== undefined) self.heal = a.annotation_self_heal;
  if (a.annotation_self_stress !== undefined) self.stress = a.annotation_self_stress;
  if (Object.keys(self).length) rules.self = self;
  const target = { ...((rules.target as Record<string, unknown>) ?? {}) };
  if (a.annotation_target_header !== undefined) target.header = a.annotation_target_header;
  if (a.annotation_target_heal !== undefined) target.heal = a.annotation_target_heal;
  if (a.annotation_target_stress !== undefined) target.stress = a.annotation_target_stress;
  if (a.annotation_target_support !== undefined) target.support = a.annotation_target_support;
  if (Object.keys(target).length) rules.target = target;
  return { ...parsed, rules } as NormalizedHeroSkillCard;
}

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
