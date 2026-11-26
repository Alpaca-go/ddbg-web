import { z } from "zod";

export const WEALD_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_FRONT.pdf";
export const WEALD_ROOM_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_BACK.pdf";
const verifiedEffectSchema = z.strictObject({
  ruling: z.enum(["R-234", "R-237", "R-238", "R-239"]),
  summary: z.string().min(1),
  runtimeReady: z.literal(false),
  effectAreaBinding: z.enum(["pending", "partial", "confirmed"]),
});

const wealdRoomBase = z.strictObject({
  id: z.string().regex(/^room:weald:\d{2}$/),
  name: z.string().min(1),
  copies: z.literal(1),
  location: z.literal("weald"),
  number: z.int().min(1).max(12),
  printedLines: z.array(z.string()).min(1),
  source: z.strictObject({
    front: z.literal(WEALD_ROOM_FRONT),
    back: z.literal(WEALD_ROOM_BACK),
    page: z.int().min(1).max(12),
  }),
  verifiedEffect: verifiedEffectSchema.nullable(),
  pendingReview: z.array(z.string()),
});

/** 九张普通房间：进入房间牌堆。 */
export const wealdNormalRoomCardSchema = wealdRoomBase
  .extend({
    number: z.int().min(1).max(9),
    boss: z.literal(false),
    source: wealdRoomBase.shape.source.extend({ page: z.int().min(1).max(9) }),
  })
  .superRefine((card, ctx) => {
    const expected = `room:weald:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Weald 普通房间身份与房间号/印刷页不一致" });
  });

/** 三张 Boss 房：只作 Boss 部署来源，poolEligible=false，不进入房间牌堆。 */
export const wealdBossRoomCardSchema = wealdRoomBase
  .extend({
    number: z.int().min(10).max(12),
    boss: z.literal(true),
    poolEligible: z.literal(false),
    classificationEvidence: z.array(z.string()).min(1),
    pendingReview: z.array(z.string()).min(1),
    source: wealdRoomBase.shape.source.extend({ page: z.int().min(10).max(12) }),
  })
  .superRefine((card, ctx) => {
    const expected = `room:weald:${String(card.number).padStart(2, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Weald Boss 房身份与房间号/印刷页不一致" });
  });

export const wealdRoomCardSchema = z.discriminatedUnion("boss", [
  wealdNormalRoomCardSchema,
  wealdBossRoomCardSchema,
]);

export const wealdRoomFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-room-v1"),
    cards: z
      .array(wealdRoomCardSchema)
      .length(12)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === 12, "十二张房间不可重复")
      .refine(
        (cards) => cards.filter((c) => !c.boss).length === 9,
        "必须恰好包含九张 Weald 普通房间",
      )
      .refine(
        (cards) => cards.filter((c) => c.boss).length === 3,
        "必须恰好包含三张 Weald Boss 房",
      ),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12")
      ctx.addIssue({ code: "custom", message: "必须包含 p1–p12 十二张房间" });
  });

export type WealdRoomCard = z.infer<typeof wealdRoomCardSchema>;
export type WealdBossRoomCard = z.infer<typeof wealdBossRoomCardSchema>;

/** 九张核准 Weald 普通房间目录；沙盒出征接线用，不改变 `usable` 战役闸门。 */
export const wealdRoomCatalogSchema = z
  .array(wealdNormalRoomCardSchema)
  .length(9)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Weald 普通房间不可重复");
