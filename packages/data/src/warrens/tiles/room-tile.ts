import { z } from "zod";

export const WARRENS_TILES_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_WARRENS_TILES_FRONT.pdf";
export const WARRENS_TILES_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_WARRENS_TILES_BACK.pdf";

/** 本刀只登记 6 张印刷板块目录；几何与 room 07–09 对应关系待印核。 */
export const warrensRoomTileSchema = z
  .strictObject({
    id: z.string().regex(/^room_tile:warrens:\d{2}$/),
    rawId: z.string().regex(/^dungeon_tile:warrens:p\d{3}$/),
    roomId: z.string().regex(/^room:warrens:\d{2}$/),
    location: z.literal("warrens"),
    number: z.int().min(1).max(6),
    name: z.string().min(1),
    printLabel: z.enum(["1", "3", "5", "7", "9", "11"]),
    source: z.strictObject({
      file: z.literal(WARRENS_TILES_FRONT),
      page: z.int().min(1).max(6),
      face: z.literal("front"),
      back: z.union([z.literal(WARRENS_TILES_BACK), z.null()]),
    }),
    geometryVerified: z.literal(false),
    usable: z.literal(false),
    pendingReview: z.array(z.string()).min(1),
  })
  .superRefine((tile, ctx) => {
    const expectedRoom = `room:warrens:${String(tile.number).padStart(2, "0")}`;
    const expectedTile = `room_tile:warrens:${String(tile.number).padStart(2, "0")}`;
    const expectedRaw = `dungeon_tile:warrens:p${String(tile.source.page).padStart(3, "0")}`;
    if (tile.roomId !== expectedRoom || tile.id !== expectedTile || tile.rawId !== expectedRaw)
      ctx.addIssue({ code: "custom", message: "Warrens 板块身份与房间号/印刷页不一致" });
  });

export const warrensRoomTileCatalogSchema = z
  .strictObject({
    schema: z.literal("ddbg-warrens-room-tile-catalog-v0"),
    tiles: z
      .array(warrensRoomTileSchema)
      .length(6)
      .refine((tiles) => new Set(tiles.map((t) => t.id)).size === 6, "六张 Warrens 板块不可重复"),
  })
  .superRefine((file, ctx) => {
    const pages = file.tiles.map((t) => t.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6")
      ctx.addIssue({ code: "custom", message: "必须覆盖印刷 Tiles FRONT p1–p6" });
  });

export type WarrensRoomTile = z.infer<typeof warrensRoomTileSchema>;
