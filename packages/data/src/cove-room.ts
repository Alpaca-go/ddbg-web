import { z } from "zod";

export const COVE_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_63x88_rooms_FRONT.pdf";
export const COVE_ROOM_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_63x88_rooms_BACK.pdf";

const sourceSchema = z.strictObject({
  front: z.literal(COVE_ROOM_FRONT),
  back: z.literal(COVE_ROOM_BACK),
  page: z.int().min(1).max(12),
});

/** 九张 Cove 普通房间目录；不混入 Boss 房，不开放出征或房间牌堆。 */
export const coveRoomCardSchema = z
  .strictObject({
    id: z.string().regex(/^room:cove:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("cove"),
    number: z.int().min(1).max(9),
    boss: z.literal(false),
    printedLines: z.array(z.string()).min(1),
    source: sourceSchema.extend({ page: z.int().min(1).max(9) }),
    pendingReview: z.array(z.string()).min(1),
  })
  .superRefine((card, ctx) => {
    const expected = `room:cove:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Cove 普通房间身份与房间号/印刷页不一致" });
  });

export const coveRoomCatalogSchema = z
  .array(coveRoomCardSchema)
  .length(9)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Cove 普通房间不可重复");

export const coveRoomFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-room-v0"),
    cards: coveRoomCatalogSchema,
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须包含 Cove 印刷 p1–p9 九张普通房间" });
  });

export type CoveRoomCard = z.infer<typeof coveRoomCardSchema>;

/** Boss 房仅登记印刷来源与审阅字段，不得进入普通房间牌堆（比照 Weald room:weald:10–12）。 */
export const coveBossRoomSourceSchema = z
  .strictObject({
    id: z.string().regex(/^room:cove:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("cove"),
    number: z.int().min(10).max(12),
    boss: z.literal(true),
    poolEligible: z.literal(false),
    printedLines: z.array(z.string()).min(1),
    source: sourceSchema.extend({ page: z.int().min(10).max(12) }),
    classificationEvidence: z.array(z.string()).min(1),
    pendingReview: z.array(z.string()).min(1),
  })
  .superRefine((card, ctx) => {
    const expected = `room:cove:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Cove Boss 房身份与房间号/印刷页不一致" });
  });

export const coveBossRoomSourceFileSchema = z.strictObject({
  schema: z.literal("ddbg-cove-boss-room-sources-v0"),
  cards: z
    .array(coveBossRoomSourceSchema)
    .length(3)
    .refine((cards) => new Set(cards.map((c) => c.id)).size === 3, "三张 Boss 房不可重复"),
});

export type CoveBossRoomSource = z.infer<typeof coveBossRoomSourceSchema>;
