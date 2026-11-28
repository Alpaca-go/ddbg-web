import { z } from "zod";

export const WARRENS_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_63x88_rooms_FRONT.pdf";
export const WARRENS_ROOM_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_63x88_rooms_BACK.pdf";

const verifiedEffectSchema = z.strictObject({
  ruling: z.enum(["R-001"]),
  summary: z.string().min(1),
  runtimeReady: z.literal(false),
  effectAreaBinding: z.enum(["pending", "partial", "confirmed"]),
});

const sourceSchema = z.strictObject({
  front: z.literal(WARRENS_ROOM_FRONT),
  back: z.union([z.literal(WARRENS_ROOM_BACK), z.null()]),
  page: z.int().min(1).max(9),
});

/** 九张普通 Warrens 房间（不含 Boss p10–p12）。 */
export const warrensNormalRoomCardSchema = z
  .strictObject({
    id: z.string().regex(/^room:warrens:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("warrens"),
    number: z.int().min(1).max(9),
    boss: z.literal(false),
    printedLines: z.array(z.string()).min(1),
    source: sourceSchema,
    verifiedEffect: verifiedEffectSchema.nullable(),
    pendingReview: z.array(z.string()),
  })
  .superRefine((card, ctx) => {
    const expected = `room:warrens:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Warrens 普通房间身份与房间号/印刷页不一致" });
  });

export const warrensRoomCatalogSchema = z
  .array(warrensNormalRoomCardSchema)
  .length(9)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Warrens 普通房间不可重复");

export const warrensRoomFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-warrens-room-v0"),
    cards: warrensRoomCatalogSchema,
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须包含 Warrens 普通房印刷 p1–p9" });
  });

export type WarrensNormalRoomCard = z.infer<typeof warrensNormalRoomCardSchema>;
