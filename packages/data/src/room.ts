import { z } from "zod";

export const ROOM_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf";
export const ROOM_BACK = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_BACK.pdf";
// 逐页核对正面地点徽记、房间编号和 BOSS 字样；不解释效果栏未确认图标。
export function roomIdentity(page: number) {
  const location = page <= 13 ? ("ruins" as const) : ("darkestDungeon" as const);
  return {
    location,
    number: page <= 13 ? page : page - 13,
    boss: (page >= 10 && page <= 13) || page >= 22,
  };
}
export const roomCardSchema = z
  .strictObject({
    id: z.string(),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.enum(["ruins", "darkestDungeon"]),
    number: z.int().positive(),
    boss: z.boolean(),
    printedLines: z.array(z.string()).min(1),
    source: z.strictObject({
      front: z.literal(ROOM_FRONT),
      back: z.literal(ROOM_BACK),
      page: z.int().min(1).max(25),
    }),
  })
  .superRefine((card, ctx) => {
    const expected = roomIdentity(card.source.page);
    if (
      card.id !== `room:p${String(card.source.page).padStart(3, "0")}` ||
      card.location !== expected.location ||
      card.number !== expected.number ||
      card.boss !== expected.boss
    )
      ctx.addIssue({ code: "custom", message: "房间身份与已核对印刷页不一致" });
  });
export const roomCatalogSchema = z
  .array(roomCardSchema)
  .length(25)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 25, "核心盒完整 25 张房间牌");
export const roomFileSchema = z.strictObject({
  schema: z.literal("ddbg-room-v1"),
  cards: roomCatalogSchema,
});
export type RoomCard = z.infer<typeof roomCardSchema>;
