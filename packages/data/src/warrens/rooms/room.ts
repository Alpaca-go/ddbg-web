import { z } from "zod";
import { WARRENS_ROOM_BACK, WARRENS_ROOM_FRONT } from "../print";

/** 与 #838 切片并用 `room:warrens:NN`（两位房间号）；raw 仍为 `room:warrens:pNNN` 页索引。 */
const roomEffectSchema = z.strictObject({
  ruling: z.literal("R-001"),
  summary: z.string().min(1),
  runtimeReady: z.literal(false),
  effectAreaBinding: z.literal("pending"),
  pendingQuestions: z.array(z.string()).min(1),
});

const roomSourceSchema = z.strictObject({
  front: z.literal(WARRENS_ROOM_FRONT),
  back: z.literal(WARRENS_ROOM_BACK),
  page: z.int().min(10).max(12),
});

export const warrensBossRoomCardSchema = z
  .strictObject({
    id: z.enum(["room:warrens:10", "room:warrens:11", "room:warrens:12"]),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("warrens"),
    number: z.int().min(10).max(12),
    boss: z.literal(true),
    poolEligible: z.literal(false),
    printedLines: z.array(z.string()).min(1),
    source: roomSourceSchema,
    verifiedEffect: roomEffectSchema.nullable(),
    classificationEvidence: z.array(z.string()).min(1),
    pendingReview: z.array(z.string()).min(1),
  })
  .superRefine((card, ctx) => {
    const expected = `room:warrens:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Warrens Boss 房身份与房间号/印刷页不一致" });
  });

export const warrensBossRoomFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-warrens-boss-room-v0"),
    cards: z
      .array(warrensBossRoomCardSchema)
      .length(3)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === 3, "三张 Boss 房不可重复"),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "10,11,12")
      ctx.addIssue({ code: "custom", message: "必须包含 Warrens Boss 房印刷 p10–p12" });
  });

export type WarrensBossRoomCard = z.infer<typeof warrensBossRoomCardSchema>;
