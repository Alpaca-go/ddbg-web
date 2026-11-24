import { z } from "zod";

/** 图标聚类 id。含义在词典里，本层不回填；未确认的不命名，见 R-048。 */
export const iconIdSchema = z.string().regex(/^[0-9a-f]{10}$/);

/** 毫米。原点在 TrimBox 左上角，y 向下。[x0, y0, x1, y1]。 */
export const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

/** 解析结果里引用的一枚图标。只有 id 和位置，没有含义。 */
export const iconRefSchema = z.strictObject({
  iconId: iconIdSchema,
  bbox: bboxSchema,
});

/**
 * 卡面上没有标签的数字。`text` 是原文，不换算成数值。
 * `left_icon` / `inside_icon` 仍是聚类 id。
 */
export const unlabeledNumberSchema = z.strictObject({
  text: z.string().min(1),
  bbox: bboxSchema,
  left_icon: iconIdSchema.optional(),
  inside_icon: iconIdSchema.optional(),
});

export const levelSchema = z.int().min(1).max(3);

export const pageListSchema = z.array(z.int().positive()).min(1);

/** 牌组副本之间唯一不同的那枚小图标。怪物卡上是标记颜色，含义不在这里命名。 */
export const copyVariantSchema = z.strictObject({
  page: z.int().positive(),
  face: z.enum(["front", "back"]),
  iconId: iconIdSchema,
});

export const quarterTurnSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);
