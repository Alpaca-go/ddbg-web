import { z } from "zod";

export const WARRENS_PUNCHBOARD_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_PUNCHBOARD_FRONT.pdf";
export const WARRENS_PUNCHBOARD_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_PUNCHBOARD_BACK.pdf";

const punchboardSourceSchema = z.strictObject({
  front: z.literal(WARRENS_PUNCHBOARD_FRONT),
  back: z.literal(WARRENS_PUNCHBOARD_BACK),
  page: z.literal(1),
});

const diecutPtSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const diecutWhPtSchema = z.tuple([z.number(), z.number()]);

export const warrensPunchboardComponentSchema = z
  .strictObject({
    id: z.string().regex(/^punchboard_component:warrens:p001:(leper|antiquarian):(front|back)$/),
    sheetId: z.literal("punchboard:warrens:p001"),
    kind: z.literal("hero_standee"),
    hero: z.enum(["LEPER", "ANTIQUARIAN"]),
    face: z.enum(["front", "back"]),
    printedLabel: z.string().min(1),
    source: punchboardSourceSchema,
    diecutPt: diecutPtSchema,
    diecutWhPt: diecutWhPtSchema,
    geometryVerified: z.literal(false),
    pendingReview: z.array(z.string()).min(1),
  })
  .superRefine((row, ctx) => {
    const expectedFace = row.id.endsWith(":front") ? "front" : "back";
    if (row.face !== expectedFace)
      ctx.addIssue({ code: "custom", message: "Warrens 冲压件 ID 与 face 不一致" });
    const heroKey = row.id.includes(":leper:") ? "LEPER" : "ANTIQUARIAN";
    if (row.hero !== heroKey)
      ctx.addIssue({ code: "custom", message: "Warrens 冲压件 ID 与 hero 不一致" });
    if (row.printedLabel !== row.hero)
      ctx.addIssue({ code: "custom", message: "印刷标签与英雄名不一致" });
  });

export const warrensPunchboardFileSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-punchboard-v0"),
  sheet: z.strictObject({
    id: z.literal("punchboard:warrens:p001"),
    trimMm: z.tuple([z.literal(145), z.literal(95)]),
    source: punchboardSourceSchema,
    geometryVerified: z.literal(false),
  }),
  components: z
    .array(warrensPunchboardComponentSchema)
    .length(4)
    .refine(
      (rows) => new Set(rows.map((r) => r.id)).size === 4,
      "Warrens 冲压板须恰好四枚双面立牌",
    ),
});

export type WarrensPunchboardFile = z.infer<typeof warrensPunchboardFileSchema>;
export type WarrensPunchboardComponent = z.infer<typeof warrensPunchboardComponentSchema>;
