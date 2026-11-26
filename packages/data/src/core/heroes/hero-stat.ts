import { z } from "zod";
import { levelSchema } from "../../shared/extract/common";
import { normalizedIconSchema, verificationSchema } from "../../shared/schema";
import { higherHeroDefenceSchema } from "./hero-higher-defence";
import { heroStatId, isHeroName } from "./hero-registry";
import { heroStatSourcesSchema } from "./hero-sources";

/** R-048/R-088/R-094/R-095：按具体front/I卡限定审批，不改词典；新旧批准日期分别保留。 */
export const approvedHeroConditionDefences: Readonly<
  Record<string, { name: string; iconId: string; kind: "stun" | "bleed" | "blight" | "debuff" }>
> = {
  "hero_stat:p001:front": { name: "CRUSADER", iconId: "8db71542d2", kind: "stun" },
  "hero_stat:p003:front": { name: "HELLION", iconId: "d29a868ed8", kind: "bleed" },
  "hero_stat:p007:front": { name: "HIGHWAYMAN", iconId: "8db71542d2", kind: "stun" },
  "hero_stat:p009:front": { name: "VESTAL", iconId: "d29a868ed8", kind: "bleed" },
  "hero_stat:p005:front": { name: "BOUNTY HUNTER", iconId: "8db71542d2", kind: "stun" },
  "hero_stat:p013:front": { name: "PLAGUE DOCTOR", iconId: "40bb356305", kind: "blight" },
  "hero_stat:p017:front": { name: "GRAVE ROBBER", iconId: "40bb356305", kind: "blight" },
  /** R-095 / 核心三英雄 2026-10-24：Occ I 与 Jester I 同 hash `8cbe7d6703` 分卡批准。 */
  "hero_stat:p019:front": { name: "OCCULTIST", iconId: "8cbe7d6703", kind: "debuff" },
  "hero_stat:p011:front": { name: "JESTER", iconId: "8cbe7d6703", kind: "debuff" },
  "hero_stat:p021:front": { name: "ABOMINATION", iconId: "40bb356305", kind: "blight" },
};
export const heroConditionDefenceSchema = z.strictObject({
  resistances: z.array(z.enum(["stun", "bleed", "blight", "debuff"])).length(1),
  immunities: z.array(z.never()).length(0),
  source: z.literal("print_front"),
  approval: z.enum([
    "kyries_review_2026-10-12",
    "kyries_review_2026-10-16",
    "kyries_review_2026-10-17",
    "kyries_review_2026-10-18",
    "kyries_review_2026-10-24",
  ]),
});
export type HeroConditionDefence = z.infer<typeof heroConditionDefenceSchema>;

/** 核心盒英雄属性的规则语义（与技能 rules 同一命名空间）。 */
export const heroStatRulesSchema = z.strictObject({
  buffDefence: z
    .strictObject({
      resistant: z.boolean(),
      immune: z.boolean(),
      source: z.literal("print_front"),
    })
    .optional(),
  conditionDefence: heroConditionDefenceSchema.optional(),
  higherConditionDefence: higherHeroDefenceSchema.optional(),
});
export const coreHeroStatAttributesSchema = z.strictObject({
  rawId: z.string().regex(/^hero_stat:p\d{3}$/),
  face: z.enum(["front", "back"]),
  name: z.string().min(1),
  level: levelSchema,
  life: z.int().positive(),
  dodge: z.int().nonnegative(),
  speed: z.int().nonnegative(),
});

/** 原四英雄、R-088赏金猎人、R-094瘟疫医生与R-095盗墓者/神秘学者分批获批，不外推同名卡。 */
export const approvedHeroStats = [
  ["hero_stat:p001", "front", "CRUSADER", 1, 17, 0, 1],
  ["hero_stat:p001", "back", "CRUSADER", 2, 24, 1, 1],
  ["hero_stat:p002", "front", "CRUSADER", 3, 32, 2, 1],
  ["hero_stat:p003", "front", "HELLION", 1, 14, 1, 2],
  ["hero_stat:p003", "back", "HELLION", 2, 18, 2, 2],
  ["hero_stat:p004", "front", "HELLION", 3, 24, 3, 2],
  ["hero_stat:p007", "front", "HIGHWAYMAN", 1, 12, 1, 2],
  ["hero_stat:p007", "back", "HIGHWAYMAN", 2, 17, 2, 2],
  ["hero_stat:p008", "front", "HIGHWAYMAN", 3, 22, 3, 3],
  ["hero_stat:p009", "front", "VESTAL", 1, 12, 0, 1],
  ["hero_stat:p009", "back", "VESTAL", 2, 17, 1, 1],
  ["hero_stat:p010", "front", "VESTAL", 3, 22, 2, 2],
  ["hero_stat:p005", "front", "BOUNTY HUNTER", 1, 14, 1, 2],
  ["hero_stat:p005", "back", "BOUNTY HUNTER", 2, 18, 2, 2],
  ["hero_stat:p006", "front", "BOUNTY HUNTER", 3, 23, 3, 2],
  ["hero_stat:p013", "front", "PLAGUE DOCTOR", 1, 11, 0, 3],
  ["hero_stat:p013", "back", "PLAGUE DOCTOR", 2, 15, 1, 3],
  ["hero_stat:p014", "front", "PLAGUE DOCTOR", 3, 19, 2, 3],
  ["hero_stat:p017", "front", "GRAVE ROBBER", 1, 11, 1, 3],
  ["hero_stat:p017", "back", "GRAVE ROBBER", 2, 15, 2, 3],
  ["hero_stat:p018", "front", "GRAVE ROBBER", 3, 19, 3, 3],
  ["hero_stat:p019", "front", "OCCULTIST", 1, 10, 1, 2],
  ["hero_stat:p019", "back", "OCCULTIST", 2, 14, 2, 2],
  ["hero_stat:p020", "front", "OCCULTIST", 3, 18, 3, 3],
  ["hero_stat:p011", "front", "JESTER", 1, 10, 2, 3],
  ["hero_stat:p011", "back", "JESTER", 2, 14, 3, 3],
  ["hero_stat:p012", "front", "JESTER", 3, 18, 4, 3],
  ["hero_stat:p015", "front", "ARBALEST", 1, 14, 0, 1],
  ["hero_stat:p015", "back", "ARBALEST", 2, 19, 1, 1],
  ["hero_stat:p016", "front", "ARBALEST", 3, 24, 2, 2],
  ["hero_stat:p021", "front", "ABOMINATION", 1, 13, 1, 2],
  ["hero_stat:p022", "front", "ABOMINATION", 2, 18, 2, 3],
  ["hero_stat:p023", "front", "ABOMINATION", 3, 23, 3, 3],
].map(([rawId, face, name, level, life, dodge, speed]) =>
  coreHeroStatAttributesSchema.parse({ rawId, face, name, level, life, dodge, speed }),
);

/** v1.1 canonical：全英雄 STAT ID（pack + hNN + 全局页）；构建器先按旧来源校验，再映射到此形状。 */
export const canonicalHeroStatCardSchema = coreHeroStatAttributesSchema
  .extend({
    rawId: z.string().regex(/^hero_stat:(?:[a-z-]+:)*p\d{3}$/),
    id: z
      .string()
      .regex(/^hero_stat:(?:core|cove|warrens|weald|musketeer):h\d{2}:p\d{3}:(?:front|back)$/),
    source: z.strictObject({ file: z.string().min(1), page: z.int().positive() }),
    attributesVerified: z.literal(true),
    approval: z.string().min(1),
    /** 规则语义（新命名空间）：只放引擎要执行的解释，不放印刷原文。 */
    rules: heroStatRulesSchema.optional(),
    lines: z.array(z.string()),
    icons: z.array(normalizedIconSchema),
    verification: verificationSchema,
  })
  .superRefine((card, ctx) => {
    const face = card.level === 2 && card.name !== "ABOMINATION" ? "back" : "front";
    if (
      !isHeroName(card.name) ||
      card.face !== face ||
      card.id !== heroStatId(card.name, card.level, face)
    )
      ctx.addIssue({ code: "custom", message: "英雄 STAT canonical ID 与英雄编号/等级/面不符" });
  });

export const normalizedHeroStatFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-normalized-v0"),
    dictionary_version: z.literal("1.8"),
    category: z.literal("hero_stat"),
    sources: heroStatSourcesSchema,
    cards: z.array(canonicalHeroStatCardSchema),
  })
  .superRefine((file, ctx) => {
    if (
      new Set(file.cards.map((card) => card.id)).size !== file.cards.length ||
      new Set(file.cards.map((card) => `${card.rawId}:${card.face}`)).size !== file.cards.length
    )
      ctx.addIssue({ code: "custom", message: "英雄属性 canonical ID 或 rawId + face 重复" });
  });

export type NormalizedHeroStatFile = z.infer<typeof normalizedHeroStatFileSchema>;
