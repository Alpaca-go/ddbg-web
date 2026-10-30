import { z } from "zod";

import { iconIdSchema } from "../extract/common";

/** 词典 `schema.status_values` 的 6 种状态。 */
export const ICON_STATUSES = [
  "confirmed",
  "confirmed_rulebook",
  "needs_review",
  "decor",
  "unsure",
  "unreviewed",
] as const;

export const iconStatusSchema = z.enum(ICON_STATUSES);

export type IconStatus = z.infer<typeof iconStatusSchema>;

const STANCES = "support|ranged|defensive|aggressive";

/** `start_<hero|monster|any>_<站位|any>`。`any` 表示同一 iconId 里不一致。 */
const START_KEY = new RegExp(`^start_(hero|monster|any)_(${STANCES}|any)$`);

/** 已确认的姿态 key：点亮/未点亮，或怪物槽、大型怪、行内、Abomination 行。 */
const CONFIRMED_STANCE_KEY = new RegExp(
  `^stance_(${STANCES})_(lit|unlit|monster_slot|large_monster|inline|abomination_row)$`,
);

const OCCUPANCY_KEY = /^(?:occupancy_pips|occupancy_pips_with_area_marker|occupancy_limit)$/;

/** 词典对 confidence 的写法：档位，后面可以带限定语。 */
const CONFIDENCE = /^(?:high|medium-high|medium|low-medium|low)(?: .+)?$/;

const confidenceSchema = z.string().regex(CONFIDENCE).nullable();

const iconSourceSchema = z.enum([
  "kyries_review_2026-10-30",
  "kyries_review_2026-10-26",
  "kyries_review_2026-10-24",
  "kyries_review_2026-10-13",
  "kyries_review_2026-10-12",
  "kyries_review_2026-10-11",
  "kyries_review_2026-10-06",
  "kyries_approved_proposal_2026-10-07",
  "kyries_approved_rulebook_2026-10-07",
  "followup_proposal_2026-10-07",
]);

const proposalSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9_]+$/),
  meaning_en: z.string().min(1),
  meaning_zh: z.string().min(1),
  confidence: z.string().regex(CONFIDENCE),
  evidence: z.string().min(1),
});

const statusCountSchema = z.strictObject({
  confirmed: z.int().nonnegative(),
  confirmed_rulebook: z.int().nonnegative(),
  needs_review: z.int().nonnegative(),
  decor: z.int().nonnegative(),
  unsure: z.int().nonnegative(),
  unreviewed: z.int().nonnegative(),
});

const coverageSchema = z.strictObject({
  card_occurrences: z.int().nonnegative(),
  card_pct: z.number().nonnegative(),
  occurrences: z.int().nonnegative(),
  occ_pct: z.number().nonnegative(),
});

/**
 * key 命名约定，对应词典 `schema.key_conventions`。
 * 返回空数组表示符合。`stance_support` 这类未写全的 key 只允许出现在未确认状态。
 */
export function iconKeyConventionIssues(icon: {
  iconId: string;
  status: IconStatus;
  key: string;
  kind: string;
  value: number | null;
}): string[] {
  const issues: string[] = [];
  const unnamed = icon.status === "unsure" || icon.status === "unreviewed";

  if (!/^[a-z0-9_]+$/.test(icon.key)) {
    issues.push("key 只能含小写字母、数字和下划线");
  }
  if (unnamed && icon.key !== `unknown_${icon.iconId}`) {
    issues.push("unsure/unreviewed 的 key 应为 unknown_<iconId>");
  }
  if (!unnamed && icon.key.startsWith("unknown_")) {
    issues.push("unknown_ 只用于 unsure/unreviewed");
  }
  if (icon.status === "decor" && icon.key !== "decor") {
    issues.push("decor 行的 key 应为 decor");
  }
  if (icon.status === "needs_review") {
    if (icon.key !== `pending_${icon.iconId}`) {
      issues.push("needs_review 的 key 应为 pending_<iconId>");
    }
    if (icon.kind !== "") {
      issues.push("needs_review 的 kind 应为空");
    }
  } else if (icon.key.startsWith("pending_")) {
    issues.push("pending_ 只用于 needs_review");
  }
  if (icon.key.startsWith("start_") && !START_KEY.test(icon.key)) {
    issues.push("start_ key 应为 start_<hero|monster|any>_<站位|any>");
  }
  if (
    (icon.status === "confirmed" || icon.status === "confirmed_rulebook") &&
    icon.key.startsWith("stance_") &&
    !CONFIRMED_STANCE_KEY.test(icon.key)
  ) {
    issues.push("已确认的 stance key 不符合命名约定");
  }
  if (icon.key.startsWith("occupancy_") && !OCCUPANCY_KEY.test(icon.key)) {
    issues.push(
      "occupancy key 应为 occupancy_pips、occupancy_pips_with_area_marker 或 occupancy_limit",
    );
  }
  if (icon.key === "skill_number" && icon.value !== null) {
    issues.push("skill_number 的数字印在旁边，value 应为 null");
  }
  if (icon.kind === "resist" && !icon.key.endsWith("_resist")) {
    issues.push("kind 为 resist 时 key 应以 _resist 结尾");
  }
  if (icon.key.endsWith("_resist") && icon.kind !== "resist") {
    issues.push("以 _resist 结尾的 key，kind 应为 resist");
  }
  return issues;
}

/** 词典里的一条图标。字段与文件开头的 `schema.IconEntry` 一致。 */
export const iconEntrySchema = z
  .strictObject({
    iconId: iconIdSchema,
    rank: z.int().min(1).max(983),
    card_occurrences: z.int().nonnegative(),
    occurrences: z.int().nonnegative(),
    status: iconStatusSchema,
    meaning_en: z.string(),
    meaning_zh: z.string(),
    kind: z.string(),
    group: z.string().regex(/^[a-z0-9_]+$/),
    key: z.string().regex(/^[a-z0-9_]+$/),
    value: z.int().nullable(),
    value_in_glyph: z.boolean(),
    placeholder: z.string().regex(/^\{icon:[0-9a-f]{10}\}$/),
    source: iconSourceSchema,
    rulebook_refs: z.array(z.string().min(1)),
    confidence: confidenceSchema,
    evidence: z.string().nullable(),
    previous_status: iconStatusSchema.nullable(),
    previous_meaning_en: z.string().nullable(),
    proposal: proposalSchema.nullable(),
    categories: z.string().regex(/^[a-z0-9_]+:\d+(?:; [a-z0-9_]+:\d+)*$/),
    notes: z.string(),
  })
  .superRefine((icon, ctx) => {
    if (icon.placeholder !== `{icon:${icon.iconId}}`) {
      ctx.addIssue({
        code: "custom",
        message: "placeholder 与 iconId 不一致",
        path: ["placeholder"],
      });
    }
    if (icon.occurrences < icon.card_occurrences) {
      ctx.addIssue({
        code: "custom",
        message: "occurrences 小于 card_occurrences",
        path: ["occurrences"],
      });
    }
    const unnamed = icon.status === "unsure" || icon.status === "unreviewed";
    if (unnamed) {
      if (icon.meaning_en !== "" || icon.meaning_zh !== "") {
        ctx.addIssue({
          code: "custom",
          message: "unsure/unreviewed 没有含义",
          path: ["meaning_en"],
        });
      }
      if (icon.kind !== "") {
        ctx.addIssue({
          code: "custom",
          message: "unsure/unreviewed 的 kind 应为空",
          path: ["kind"],
        });
      }
    }
    if (icon.value_in_glyph !== (icon.value !== null)) {
      ctx.addIssue({
        code: "custom",
        message: "value 只在数字属于图形本身时填写",
        path: ["value"],
      });
    }
    for (const issue of iconKeyConventionIssues(icon)) {
      ctx.addIssue({ code: "custom", message: issue, path: ["key"] });
    }
  });

export type IconEntry = z.infer<typeof iconEntrySchema>;

const iconFieldDocSchema = z.strictObject({
  type: z.string().min(1),
  pattern: z.string().min(1).optional(),
  desc: z.string().min(1).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  values: z.array(z.string().min(1)).min(1).optional(),
});

const iconEntryDocSchema = z.strictObject({
  iconId: iconFieldDocSchema,
  rank: iconFieldDocSchema,
  card_occurrences: iconFieldDocSchema,
  occurrences: iconFieldDocSchema,
  status: iconFieldDocSchema,
  meaning_en: iconFieldDocSchema,
  meaning_zh: iconFieldDocSchema,
  kind: iconFieldDocSchema,
  group: iconFieldDocSchema,
  key: iconFieldDocSchema,
  value: iconFieldDocSchema,
  value_in_glyph: iconFieldDocSchema,
  placeholder: iconFieldDocSchema,
  source: iconFieldDocSchema,
  rulebook_refs: iconFieldDocSchema,
  confidence: iconFieldDocSchema,
  evidence: iconFieldDocSchema,
  previous_status: iconFieldDocSchema,
  previous_meaning_en: iconFieldDocSchema,
  proposal: iconFieldDocSchema,
  categories: iconFieldDocSchema,
  notes: iconFieldDocSchema,
});

/** `icon-dictionary-v1.8.json`。含字段说明、元数据、已知不一致和 976 条图标。 */
export const iconDictionarySchema = z
  .strictObject({
    schema: z.strictObject({
      description: z.string().min(1),
      top_level: z.strictObject({
        schema: z.string().min(1),
        meta: z.string().min(1),
        inconsistencies: z.string().min(1),
        icons: z.string().min(1),
      }),
      IconEntry: iconEntryDocSchema,
      status_values: z.strictObject({
        confirmed: z.string().min(1),
        confirmed_rulebook: z.string().min(1),
        needs_review: z.string().min(1),
        decor: z.string().min(1),
        unsure: z.string().min(1),
        unreviewed: z.string().min(1),
      }),
      key_conventions: z.array(z.string().min(1)).min(1),
    }),
    meta: z.strictObject({
      name: z.string().min(1),
      version: z.literal("1.8"),
      generated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      based_on: z.string().min(1),
      input: z.string().min(1),
      rules: z.array(z.string().min(1)).min(1),
      rule_sources: z.array(z.string().min(1)).min(1),
      stats: z.strictObject({
        total_card_occurrences: z.int().nonnegative(),
        total_occurrences: z.int().nonnegative(),
        top525_card_occurrences: z.int().nonnegative(),
        status_top525: statusCountSchema,
        status_all976: statusCountSchema,
        coverage_all976_confirmed_rulebook_decor: coverageSchema,
        coverage_top525_confirmed_rulebook_decor: z.strictObject({
          card_occurrences: z.int().nonnegative(),
          card_pct: z.number().nonnegative(),
        }),
        coverage_all976_plus_needs_review: coverageSchema,
        coverage_all976_by_status: z.strictObject({
          confirmed: coverageSchema,
          confirmed_rulebook: coverageSchema,
          needs_review: coverageSchema,
          decor: coverageSchema,
          unsure: coverageSchema,
          unreviewed: coverageSchema,
        }),
      }),
      resolved_in_v1_1: z.array(z.string().min(1)),
      resolved_in_v1_2: z.array(z.string().min(1)).min(1),
      resolved_in_v1_3: z.array(z.string().min(1)).min(1),
      resolved_in_v1_4: z.array(z.string().min(1)).min(1),
      resolved_in_v1_5: z.array(z.string().min(1)).min(1),
      resolved_in_v1_6: z.array(z.string().min(1)).min(1),
      resolved_in_v1_7: z.array(z.string().min(1)).min(1),
      resolved_in_v1_8: z.array(z.string().min(1)).min(1),
    }),
    inconsistencies: z.array(
      z.strictObject({
        id: z.string().min(1),
        ranks: z.array(z.int().min(1).max(976)).min(1),
        issue: z.string().min(1),
      }),
    ),
    icons: z.array(iconEntrySchema).length(983),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    const ranks = new Set<number>();
    for (const [index, icon] of file.icons.entries()) {
      if (ids.has(icon.iconId)) {
        ctx.addIssue({
          code: "custom",
          message: `重复 iconId ${icon.iconId}`,
          path: ["icons", index, "iconId"],
        });
      }
      ids.add(icon.iconId);
      if (ranks.has(icon.rank)) {
        ctx.addIssue({
          code: "custom",
          message: `重复 rank ${icon.rank}`,
          path: ["icons", index, "rank"],
        });
      }
      ranks.add(icon.rank);
    }
    for (let rank = 1; rank <= file.icons.length; rank += 1) {
      if (!ranks.has(rank)) {
        ctx.addIssue({
          code: "custom",
          message: `缺少 rank ${rank}`,
          path: ["icons"],
        });
        break;
      }
    }
  });

export type IconDictionary = z.infer<typeof iconDictionarySchema>;
