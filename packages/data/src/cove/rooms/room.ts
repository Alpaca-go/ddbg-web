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

const coveRoomBase = z
  .strictObject({
    id: z.string().regex(/^room:cove:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("cove"),
    number: z.int().min(1).max(12),
    printedLines: z.array(z.string()).min(1),
    source: sourceSchema,
    pendingReview: z.array(z.string()).min(1),
  })
  .superRefine((card, ctx) => {
    const expected = `room:cove:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Cove 房间身份与房间号/印刷页不一致" });
  });

/** 九张普通房间：进入房间牌堆。 */
export const coveNormalRoomCardSchema = coveRoomBase.safeExtend({
  number: z.int().min(1).max(9),
  boss: z.literal(false),
});

/** 三张 Boss 房：只作 Boss 部署来源，poolEligible=false，不进入房间牌堆。 */
export const coveBossRoomCardSchema = coveRoomBase.safeExtend({
  number: z.int().min(10).max(12),
  boss: z.literal(true),
  poolEligible: z.literal(false),
  classificationEvidence: z.array(z.string()).min(1),
});

export const coveRoomCardSchema = z.discriminatedUnion("boss", [
  coveNormalRoomCardSchema,
  coveBossRoomCardSchema,
]);

export const coveRoomCatalogSchema = z
  .array(coveRoomCardSchema)
  .length(12)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 12, "十二张 Cove 房间不可重复")
  .refine((cards) => cards.filter((c) => !c.boss).length === 9, "必须恰好包含九张 Cove 普通房间")
  .refine((cards) => cards.filter((c) => c.boss).length === 3, "必须恰好包含三张 Cove Boss 房");

export const coveRoomFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-room-v0"),
    cards: coveRoomCatalogSchema,
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12")
      ctx.addIssue({ code: "custom", message: "必须包含 Cove 印刷 p1–p12 十二张房间" });
  });

export type CoveRoomCard = z.infer<typeof coveRoomCardSchema>;
export type CoveBossRoomCard = z.infer<typeof coveBossRoomCardSchema>;
