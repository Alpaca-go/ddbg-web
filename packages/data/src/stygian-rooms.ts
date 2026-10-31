import { z } from "zod";
import { roomFileSchema } from "./room";

export const STYGIAN_ROOM_FRONT =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_Stygian_FRONT.pdf";
export const STYGIAN_ROOM_BACK =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_Stygian_BACK.pdf";

/** R-036：九张遗迹、八张最暗非Boss房间；不推断印刷几何。 */
export function stygianRoomIdentity(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 17) throw new Error("Stygian房间页码无效");
  return {
    location: page <= 9 ? ("ruins" as const) : ("darkestDungeon" as const),
    number: page <= 9 ? page : page - 9,
    replacesCardId: `room:p${String(page <= 9 ? page : page + 4).padStart(3, "0")}`,
  };
}
export const stygianRoomsSchema = z
  .strictObject({
    schema: z.literal("ddbg-stygian-rooms-v1"),
    cards: z
      .array(
        z.strictObject({
          id: z.string(),
          name: z.string().min(1),
          copies: z.literal(1),
          location: z.enum(["ruins", "darkestDungeon"]),
          number: z.int().positive(),
          replacesCardId: z.string(),
          printedLines: z.array(z.string()).min(1),
          source: z.strictObject({
            front: z.literal(STYGIAN_ROOM_FRONT),
            back: z.literal(STYGIAN_ROOM_BACK),
            page: z.int().min(1).max(17),
          }),
        }),
      )
      .length(17),
  })
  .superRefine((file, ctx) => {
    for (const [i, c] of file.cards.entries()) {
      if (i >= 17) continue;
      const page = i + 1,
        identity = stygianRoomIdentity(page);
      if (
        c.id !== `stygian_room:p${String(page).padStart(3, "0")}` ||
        c.source.page !== page ||
        c.location !== identity.location ||
        c.number !== identity.number ||
        c.replacesCardId !== identity.replacesCardId
      )
        ctx.addIssue({ code: "custom", message: "Stygian房间身份或替换关系不符" });
    }
  });
export type StygianRooms = z.infer<typeof stygianRoomsSchema>;

/** 只提供R-036的替换卡查询；八张Boss卡没有替换项。 */
export function readStygianRoomReplacement(file: StygianRooms, standardCardId: string) {
  return stygianRoomsSchema.parse(file).cards.find((c) => c.replacesCardId === standardCardId);
}

export function validateStygianRoomNames(
  file: StygianRooms,
  rooms: z.infer<typeof roomFileSchema>,
) {
  const standard = roomFileSchema.parse(rooms);
  for (const card of file.cards) {
    const target = standard.cards.find((c) => c.id === card.replacesCardId);
    if (
      !target ||
      target.boss ||
      target.name !== card.name ||
      target.location !== card.location ||
      target.number !== card.number
    )
      throw new Error("Stygian替换目标须为同名同地点编号的非Boss房间（R-036）");
  }
}
