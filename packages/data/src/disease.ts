import { z } from "zod";
import { normalizedIconSchema, segmentSchema, verificationSchema } from "./normalize/schema";

export const DISEASE_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_Disease_FRONT.pdf";
export const DISEASE_BACK = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_Disease_BACK.pdf";
const effectSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("status"),
    kind: z.enum(["bleed", "blight"]),
    amount: z.literal(1),
    duration: z.union([z.literal(2), z.literal(4)]),
  }),
  z.strictObject({
    type: z.literal("wounds"),
    amount: z.union([z.literal(1), z.literal(2)]),
    perHeroLevel: z.boolean(),
  }),
  z.strictObject({ type: z.literal("stress"), amount: z.union([z.literal(1), z.literal(2)]) }),
  z.strictObject({ type: z.literal("discardFood"), count: z.literal(1), ifAny: z.literal(true) }),
  z.strictObject({ type: z.literal("virtueChance"), amount: z.literal(-1) }),
]);
export const diseaseRuleSchema = z.strictObject({
  trigger: z.enum([
    "bleedToApply",
    "blightToApply",
    "foodConsumed",
    "resolveTested",
    "moveAction",
    "damageTaken",
    "shuffled",
    "stressSuffered",
    "rubbleResolved",
    "hungerResolved",
  ]),
  effects: z.array(effectSchema).min(1),
  source: z.strictObject({
    file: z.literal("DD_EN_COREBOX_RULES.pdf"),
    page: z.union([z.literal(27), z.literal(28)]),
  }),
});
export type DiseaseRule = z.infer<typeof diseaseRuleSchema>;
/** 逐项只来自官方明文 R27–28；不按疾病卡未命名图标推理。 */
export const diseaseRules: readonly { name: string; rule: DiseaseRule }[] = [
  {
    name: "Black Plague",
    rule: {
      trigger: "blightToApply",
      effects: [
        { type: "status", kind: "blight", amount: 1, duration: 2 },
        { type: "wounds", amount: 2, perHeroLevel: true },
      ],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 27 },
    },
  },
  {
    name: "Bulimic",
    rule: {
      trigger: "foodConsumed",
      effects: [
        { type: "discardFood", count: 1, ifAny: true },
        { type: "stress", amount: 1 },
      ],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 27 },
    },
  },
  {
    name: "Ennui",
    rule: {
      trigger: "resolveTested",
      effects: [{ type: "virtueChance", amount: -1 }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Hemophilia",
    rule: {
      trigger: "bleedToApply",
      effects: [
        { type: "status", kind: "bleed", amount: 1, duration: 2 },
        { type: "wounds", amount: 2, perHeroLevel: true },
      ],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Lethargy",
    rule: {
      trigger: "moveAction",
      effects: [{ type: "wounds", amount: 1, perHeroLevel: true }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Syphilis",
    rule: {
      trigger: "damageTaken",
      effects: [{ type: "wounds", amount: 1, perHeroLevel: true }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Vertigo",
    rule: {
      trigger: "shuffled",
      effects: [{ type: "stress", amount: 2 }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "The Worries",
    rule: {
      trigger: "stressSuffered",
      effects: [
        { type: "stress", amount: 1 },
        { type: "wounds", amount: 2, perHeroLevel: false },
      ],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Creeping Cough",
    rule: {
      trigger: "rubbleResolved",
      effects: [{ type: "status", kind: "bleed", amount: 1, duration: 4 }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Tapeworm",
    rule: {
      trigger: "hungerResolved",
      effects: [{ type: "status", kind: "bleed", amount: 1, duration: 4 }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
  {
    name: "Spotted Fever",
    rule: {
      trigger: "damageTaken",
      effects: [{ type: "status", kind: "blight", amount: 1, duration: 2 }],
      source: { file: "DD_EN_COREBOX_RULES.pdf", page: 28 },
    },
  },
];
export const diseaseCardSchema = z
  .strictObject({
    id: z.string().regex(/^disease:p\d{3}$/),
    name: z.string(),
    copies: z.literal(1),
    source: z.strictObject({
      front: z.literal(DISEASE_FRONT),
      back: z.literal(DISEASE_BACK),
      page: z.int().min(1).max(11),
    }),
    lines: z.array(z.array(segmentSchema)),
    icons: z.array(normalizedIconSchema),
    verification: verificationSchema,
    rule: diseaseRuleSchema,
  })
  .superRefine((card, ctx) => {
    const icons = [
      ...card.icons,
      ...card.lines.flat().flatMap((s) => (s.type === "icon" ? [s.icon] : [])),
    ];
    if (
      card.verification.unverified !== card.verification.reasons.length > 0 ||
      icons.some(
        (i) => i.naming === "unverified" && !card.verification.reasons.includes(`icon:${i.iconId}`),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "疾病未知图标须保留未验证原因，官方明文不升级卡面图标",
      });
    const expected = diseaseRules[card.source.page - 1];
    if (
      card.id !== `disease:p${String(card.source.page).padStart(3, "0")}` ||
      !expected ||
      card.name !== expected.name ||
      JSON.stringify(card.rule) !== JSON.stringify(expected.rule)
    )
      ctx.addIssue({ code: "custom", message: "疾病身份 / 印刷页 / 官方规则内容漂移" });
  });
export const diseaseFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-disease-v0"),
    category: z.literal("disease"),
    sources: z.strictObject({
      raw: z.literal("extract/corebox/raw/disease.json"),
      dictionary: z.literal("dictionary/icon-dictionary-v1.8.json"),
      rules: z.literal("DD_EN_COREBOX_RULES.pdf"),
    }),
    cards: z.array(diseaseCardSchema).length(11),
  })
  .superRefine((file, ctx) => {
    if (new Set(file.cards.map((c) => c.id)).size !== 11)
      ctx.addIssue({ code: "custom", message: "疾病牌必须为 11 张唯一实体牌" });
  });
export type DiseaseCard = z.infer<typeof diseaseCardSchema>;
export type DiseaseFile = z.infer<typeof diseaseFileSchema>;
