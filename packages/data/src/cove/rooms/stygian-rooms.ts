import { z } from "zod";
import { coveRoomFileSchema } from "./room";

export const COVE_STYGIAN_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_63x88_rooms_Stygian_FRONT.pdf";

export const COVE_STYGIAN_PENDING = "Q-186：Cove Stygian 房间效果待 Kyries 逐卡核准";

/** 九张 Cove 普通非 Boss 房间；按印刷页 p1–p9 替换同名同编号卡（类推核心 R-036 / Weald Stygian，不新增裁定号）。 */
export function coveStygianRoomIdentity(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 9) throw new Error("Cove Stygian 房间页码无效");
  return {
    location: "cove" as const,
    number: page,
    replacesCardId: `room:cove:${String(page).padStart(2, "0")}`,
  };
}

const coveStygianRoomCardSchema = z
  .strictObject({
    id: z.string().regex(/^stygian_room:cove:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("cove"),
    number: z.int().min(1).max(9),
    replacesCardId: z.string().regex(/^room:cove:0[1-9]$/),
    printedLines: z.array(z.string()).min(1),
    pendingReview: z.array(z.string()).min(1),
    expeditionRoomPoolEligible: z.literal(false),
    source: z.strictObject({
      front: z.literal(COVE_STYGIAN_ROOM_FRONT),
      back: z.null(),
      page: z.int().min(1).max(9),
    }),
  })
  .superRefine((card, ctx) => {
    const expected = coveStygianRoomIdentity(card.source.page);
    if (
      card.id !== `stygian_room:cove:${String(card.source.page).padStart(2, "0")}` ||
      card.number !== expected.number ||
      card.replacesCardId !== expected.replacesCardId
    )
      ctx.addIssue({ code: "custom", message: "Cove Stygian 房间身份或替换关系不符" });
    if (!card.pendingReview.some((line) => line.includes("Q-186")))
      ctx.addIssue({ code: "custom", message: "Cove Stygian 房间效果须保留 Q-186 停点" });
  });

export const coveStygianRoomsSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-stygian-rooms-v1"),
    cards: z
      .array(coveStygianRoomCardSchema)
      .length(9)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Stygian 房间不可重复"),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须包含 p1–p9 九张 Cove Stygian 房间" });
  });

export type CoveStygianRooms = z.infer<typeof coveStygianRoomsSchema>;

/** 目录查询：按被替换的普通房间 id 返回 Stygian 卡；未启用 Cove 包时不应加载本文件。 */
export function readCoveStygianRoomReplacement(file: CoveStygianRooms, standardCardId: string) {
  return coveStygianRoomsSchema.parse(file).cards.find((c) => c.replacesCardId === standardCardId);
}

export function validateCoveStygianRoomNames(
  file: CoveStygianRooms,
  rooms: z.infer<typeof coveRoomFileSchema>,
) {
  const standard = coveRoomFileSchema.parse(rooms);
  for (const card of file.cards) {
    const target = standard.cards.find((c) => c.id === card.replacesCardId);
    if (
      !target ||
      target.boss ||
      target.name !== card.name ||
      target.location !== card.location ||
      target.number !== card.number
    )
      throw new Error(
        "Cove Stygian 替换目标须为同名同地点编号的非 Boss 普通房间；不得替换 Boss 房",
      );
  }
}
