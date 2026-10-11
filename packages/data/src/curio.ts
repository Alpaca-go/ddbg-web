import { z } from "zod";

export const CURIO_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf";
export const CURIO_BACK = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_CURIO_BACK.pdf";
export const curioEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("stress"), amount: z.literal(1) }),
  z.strictObject({ type: z.literal("gold"), amount: z.union([z.literal(5), z.literal(10)]) }),
  z.strictObject({
    type: z.literal("status"),
    kind: z.enum(["bleed", "blight"]),
    amount: z.literal(1),
    duration: z.literal(3),
  }),
  z.strictObject({ type: z.literal("drawDisease"), count: z.literal(1) }),
]);
export const curioCardSchema = z
  .strictObject({
    id: z.string().regex(/^curio:p\d{3}$/),
    name: z.string().min(1),
    text: z.string().min(1),
    copies: z.literal(1),
    source: z.strictObject({
      front: z.literal(CURIO_FRONT),
      back: z.literal(CURIO_BACK),
      page: z.int().min(1).max(24),
    }),
    rows: z
      .array(
        z.strictObject({
          printed: z.string().min(1),
          iconId: z.string().regex(/^[0-9a-f]{10}$/),
          effect: curioEffectSchema.nullable(),
          reason: z.string().nullable(),
        }),
      )
      .min(1),
  })
  .superRefine((c, ctx) => {
    if (c.id !== `curio:p${String(c.source.page).padStart(3, "0")}`)
      ctx.addIssue({ code: "custom", message: "卡 ID / 印刷页不一致" });
    if (c.rows.some((r) => (r.effect === null) !== (r.reason !== null)))
      ctx.addIssue({ code: "custom", message: "未确认行必须给出停点原因" });
  });
export const curioCatalogSchema = z
  .array(curioCardSchema)
  .length(24)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 24, "完整 24 张，不可重复或缩减牌堆");
export const curioFileSchema = z.strictObject({
  schema: z.literal("ddbg-curio-v1"),
  dictionaryVersion: z.literal("1.8"),
  cards: curioCatalogSchema,
});
export type CurioCard = z.infer<typeof curioCardSchema>;
export type CurioEffect = z.infer<typeof curioEffectSchema>;
