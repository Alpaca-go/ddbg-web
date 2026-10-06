import { z } from "zod";

import { bboxSchema, copyVariantSchema, iconIdSchema, quarterTurnSchema } from "./common";

/** 报告第 2.1 节的卡牌类别。报告第 8 节说「18 个」，列出的是这 16 个。 */
export const RAW_CARD_CATEGORIES = [
  "hero_skill",
  "hero_stat",
  "hero_pvp",
  "monster_medium",
  "monster_large",
  "boss_ability",
  "trinket",
  "curio",
  "room",
  "stygian_room",
  "quest",
  "hamlet_event",
  "quirk",
  "disease",
  "virtue_affliction",
  "player_aid",
] as const;

/** 版面。报告标为可选；印刷 PDF 不入库，所以和卡牌一起保存。 */
export const RAW_SHEET_CATEGORIES = [
  "save_sheet",
  "letter",
  "hamlet_board",
  "punchboard_300x300",
  "punchboard_200x300",
  "punchboard_130x106",
  "dungeon_tile",
] as const;

const rawCategorySchema = z.enum([...RAW_CARD_CATEGORIES, ...RAW_SHEET_CATEGORIES]);

const spanSchema = z.strictObject({
  t: z.string().min(1),
  bbox: bboxSchema,
  font: z.string().min(1),
  size: z.number().positive(),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
  rot: quarterTurnSchema.optional(),
  dup: z.int().min(2).optional(),
});

const iconPlacementSchema = z.strictObject({
  iconId: iconIdSchema,
  bbox: bboxSchema,
  bbox_full: bboxSchema.optional(),
  decor: z.literal(true).optional(),
  container: z.literal(true).optional(),
  varies_between_copies: z.literal(true).optional(),
});

const lineSchema = z.strictObject({
  rot: quarterTurnSchema,
  text: z.string(),
  bbox: bboxSchema,
});

const faceSchema = z.strictObject({
  file: z.string().min(1),
  page: z.int().positive(),
  trim_mm: z.tuple([z.number().positive(), z.number().positive()]),
  face_phash: z.string().regex(/^[0-9a-f]{16}$/),
  spans: z.array(spanSchema),
  icons: z.array(iconPlacementSchema),
  lines: z.array(lineSchema),
});

const rawSourceSchema = z.strictObject({
  front: z.string().min(1),
  back: z.string().min(1).nullable(),
  source_set: z.enum(["base", "ADD_014"]),
  kind: z.enum(["card", "sheet"]),
  front_pages: z.int().positive(),
  back_pages: z.int().positive().nullable(),
});

const rawCardSchema = z.strictObject({
  id: z.string().min(1),
  source_set: z.enum(["base", "ADD_014"]),
  copies: z.int().positive(),
  pages: z.array(z.int().positive()).min(1),
  copy_variants: z.array(copyVariantSchema).optional(),
  faces: z.strictObject({
    front: faceSchema,
    back: faceSchema.optional(),
  }),
});

const sheetCategories = new Set<string>(RAW_SHEET_CATEGORIES);

/** `ddbg-raw-v1`：一张印刷页的文字 span、图标放置和阅读顺序。 */
export const rawFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-raw-v1"),
    extractor_version: z.literal("1.0.4"),
    category: rawCategorySchema,
    kind: z.enum(["card", "sheet"]),
    units: z.strictObject({
      length: z.literal("mm"),
      origin: z.literal("top-left corner of the PDF TrimBox (card face, bleed excluded)"),
      y_axis: z.literal("down"),
      font_size: z.literal("pt"),
    }),
    sources: z.array(rawSourceSchema).min(1),
    n_pages: z.int().nonnegative(),
    n_unique: z.int().nonnegative(),
    n_copies_total: z.int().nonnegative(),
    cards: z.array(rawCardSchema),
  })
  .superRefine((file, ctx) => {
    const expectSheet = sheetCategories.has(file.category);
    if ((file.kind === "sheet") !== expectSheet) {
      ctx.addIssue({
        code: "custom",
        message: "kind 与类别不符",
        path: ["kind"],
      });
    }
    if (file.n_unique !== file.cards.length) {
      ctx.addIssue({
        code: "custom",
        message: "n_unique 与 cards.length 不一致",
        path: ["n_unique"],
      });
    }
    const copies = file.cards.reduce((sum, card) => sum + card.copies, 0);
    if (file.n_copies_total !== copies) {
      ctx.addIssue({
        code: "custom",
        message: "n_copies_total 与副本数之和不一致",
        path: ["n_copies_total"],
      });
    }
    if (file.n_pages !== file.n_copies_total) {
      ctx.addIssue({
        code: "custom",
        message: "n_pages 与 n_copies_total 不一致",
        path: ["n_pages"],
      });
    }
    file.sources.forEach((source, index) => {
      if (source.kind !== file.kind) {
        ctx.addIssue({
          code: "custom",
          message: "source.kind 与文件 kind 不一致",
          path: ["sources", index, "kind"],
        });
      }
      if ((source.back === null) !== (source.back_pages === null)) {
        ctx.addIssue({
          code: "custom",
          message: "back 与 back_pages 必须同时为空或同时有值",
          path: ["sources", index, "back"],
        });
      }
    });
    file.cards.forEach((card, index) => {
      if (card.copies !== card.pages.length) {
        ctx.addIssue({
          code: "custom",
          message: "copies 与 pages.length 不一致",
          path: ["cards", index, "copies"],
        });
      }
      if (!card.faces.back && card.copies > 0 && file.kind === "card") {
        ctx.addIssue({
          code: "custom",
          message: "卡牌缺少背面",
          path: ["cards", index, "faces", "back"],
        });
      }
    });
  });

export type RawFile = z.infer<typeof rawFileSchema>;
