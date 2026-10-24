import { z } from "zod";

import {
  bboxSchema,
  copyVariantSchema,
  iconIdSchema,
  iconRefSchema,
  levelSchema,
  pageListSchema,
  unlabeledNumberSchema,
} from "./common";

const issuesSchema = z.array(z.string());

const parsedStatsSchema = z.strictObject({
  cards: z.int().nonnegative(),
  ok: z.int().nonnegative(),
  failed: z.int().nonnegative(),
  success_rate: z.number().min(0).max(1),
});

const parsedFailureSchema = z.strictObject({
  id: z.string().min(1),
  pages: pageListSchema,
  issues: z.array(z.string()).min(1),
});

function parsedFileSchema<T extends z.ZodType>(category: string, cardSchema: T) {
  return z.strictObject({
    schema: z.literal("ddbg-parsed-v0"),
    extractor_version: z.literal("1.0.4"),
    category: z.literal(category),
    source: z.union([
      z.literal(`raw/corebox/${category}.json`),
      z.literal(`raw/extension/warrens/${category}.json`),
    ]),
    field_notes: z.string().min(1),
    icon_token: z.literal("{icon:<iconId>} = unannotated icon cluster, see icons/catalog.json"),
    stats: parsedStatsSchema,
    failures: z.array(parsedFailureSchema),
    cards: z.array(cardSchema),
  });
}

const heroSkillFields = {
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  level: levelSchema,
  crit: z.int().optional(),
  crit_value: z.int().nullable().optional(),
  crit_raw: z.string().min(1).optional(),
  acc: z.int().optional(),
  acc_value: z.int().nullable().optional(),
  acc_raw: z.string().min(1).optional(),
  top_row_icons: z.array(iconRefSchema),
  name_row_icons: z.array(iconRefSchema),
  stats_line_raw: z.string().nullable(),
  effect_lines_raw: z.array(z.string()),
  unlabeled_numbers: z.array(unlabeledNumberSchema),
  issues: issuesSchema,
};

/** 背面印着英雄名的技能卡。 */
const standardHeroSkillCardSchema = z.strictObject({
  ...heroSkillFields,
  hero: z.string().min(1),
  back_name: z.string().min(1),
  back_level: levelSchema,
});

/** 背面是另一张技能面（Abomination 变身）。英雄名没有印出来。 */
const doubleFacedHeroSkillCardSchema = z.strictObject({
  ...heroSkillFields,
  hero: z.null(),
  card_kind: z.literal("double_faced_skill"),
  back_face_skill: z.strictObject({
    name: z.string().min(1),
    level: levelSchema,
    lines_raw: z.array(z.string()),
  }),
});

export const heroSkillCardSchema = z.union([
  standardHeroSkillCardSchema,
  doubleFacedHeroSkillCardSchema,
]);

export const heroSkillFileSchema = parsedFileSchema("hero_skill", heroSkillCardSchema);

const monsterSkillSchema = z.strictObject({
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  block_bbox: bboxSchema,
  target: z.string().min(1).optional(),
  crit: z.int().optional(),
  crit_value: z.int().nullable().optional(),
  acc: z.int().optional(),
  acc_value: z.int().nullable().optional(),
  effect_lines_raw: z.array(z.string()),
  lines_raw: z.array(z.string()),
  unlabeled_numbers: z.array(unlabeledNumberSchema),
});

const monsterIdentityFields = {
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  copy_variants: z.array(copyVariantSchema).optional(),
  name: z.string().min(1),
  type_position_raw: z.string().min(1),
  type_position_tags: z.array(z.string().min(1)).min(1),
  level: levelSchema,
  issues: issuesSchema,
};

/**
 * 中型牌堆里代替大型怪物的参考卡。完整数值在 monster_large。
 * 头部以外的数字不在这里命名。
 */
const largeMonsterReferenceSchema = z.strictObject({
  ...monsterIdentityFields,
  card_kind: z.literal("large_monster_reference"),
  lines_raw: z.array(z.string()),
});

/**
 * 普通怪物卡。`hp` 是规则书 p.24 标为 Life 的心形里的数字，字段名沿用提取 JSON。
 * 抗性 / 免疫只保留图标 id。头部其余数字在 `header_unlabeled_numbers`。
 */
const monsterCardSchema = z.strictObject({
  ...monsterIdentityFields,
  hp: z.int().positive(),
  hp_icon: iconIdSchema,
  resistances_icons: z.array(iconIdSchema),
  immunities_icons: z.array(iconIdSchema),
  skills: z.array(monsterSkillSchema).min(1),
  header_unlabeled_numbers: z.array(unlabeledNumberSchema),
  footer_lines_raw: z.array(z.string()),
  back_texts: z.array(z.string()),
});

export const monsterMediumCardSchema = z.union([largeMonsterReferenceSchema, monsterCardSchema]);

export const monsterMediumFileSchema = parsedFileSchema("monster_medium", monsterMediumCardSchema);

export const monsterLargeCardSchema = monsterCardSchema;

export const monsterLargeFileSchema = parsedFileSchema("monster_large", monsterLargeCardSchema);

const trinketHalfSchema = z.strictObject({
  name: z.string().min(1),
  level: levelSchema,
  effect_lines_raw: z.array(z.string()),
  printed_rotation: z.union([z.literal(0), z.literal(180)]),
});

/** 饰品。不断言 upright / inverted 哪一半是正面效果。 */
export const trinketCardSchema = z.strictObject({
  id: z.string().min(1),
  pages: pageListSchema,
  copies: z.int().positive(),
  name: z.string().min(1),
  level: levelSchema,
  back_level: levelSchema,
  upright_half: trinketHalfSchema,
  inverted_half: trinketHalfSchema,
  issues: issuesSchema,
});

export const trinketFileSchema = parsedFileSchema("trinket", trinketCardSchema);

export type HeroSkillCard = z.infer<typeof heroSkillCardSchema>;
export type HeroSkillFile = z.infer<typeof heroSkillFileSchema>;
export type MonsterMediumCard = z.infer<typeof monsterMediumCardSchema>;
export type MonsterMediumFile = z.infer<typeof monsterMediumFileSchema>;
export type MonsterLargeCard = z.infer<typeof monsterLargeCardSchema>;
export type MonsterLargeFile = z.infer<typeof monsterLargeFileSchema>;
export type TrinketCard = z.infer<typeof trinketCardSchema>;
export type TrinketFile = z.infer<typeof trinketFileSchema>;
