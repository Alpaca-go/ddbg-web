import { z } from "zod";

export const COVE_TILES_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_COVE_TILES_FRONT.pdf";

const verifiedSourceSchema = z.strictObject({
  status: z.literal("verified"),
  file: z.literal(COVE_TILES_FRONT),
  page: z.int().min(1).max(6),
  face: z.enum(["front", "back"]),
});

const pendingSourceSchema = z.strictObject({
  status: z.literal("pending"),
  reason: z.string().min(1),
});

export const coveTileSourceSchema = z.discriminatedUnion("status", [
  verifiedSourceSchema,
  pendingSourceSchema,
]);

const coveTileBase = z
  .strictObject({
    id: z.string().regex(/^room_tile:cove:\d{2}$/),
    rawId: z.string().regex(/^dungeon_tile:cove:p\d{3}$/),
    roomId: z.string().regex(/^room:cove:\d{2}$/),
    location: z.literal("cove"),
    number: z.int().min(1).max(12),
    name: z.string().min(1),
    boss: z.boolean(),
    poolEligible: z.boolean(),
    source: coveTileSourceSchema,
    printedRoomNumber: z.union([z.int().min(1).max(12), z.null()]),
    geometryVerified: z.literal(false),
    geometryComplete: z.literal(false),
    usable: z.literal(false),
    runtimeReady: z.literal(false),
    pendingReview: z.array(z.string()).min(1),
    classificationEvidence: z.array(z.string()).optional(),
  })
  .superRefine((tile, ctx) => {
    const expectedRoom = `room:cove:${String(tile.number).padStart(2, "0")}`;
    const expectedTile = `room_tile:cove:${String(tile.number).padStart(2, "0")}`;
    if (tile.roomId !== expectedRoom || tile.id !== expectedTile)
      ctx.addIssue({ code: "custom", message: "板块 ID / roomId 必须与 number 一致" });
    if (tile.boss !== tile.number >= 10)
      ctx.addIssue({ code: "custom", message: "Boss 分类必须与房间号 10–12 一致" });
    if (tile.boss && tile.poolEligible)
      ctx.addIssue({ code: "custom", message: "Boss 板块不得 poolEligible" });
    if (!tile.boss && !tile.poolEligible)
      ctx.addIssue({
        code: "custom",
        message: "普通板块目录默认 poolEligible=true（仅登记，未接线）",
      });
    if (
      tile.source.status === "verified" &&
      tile.source.face === "back" &&
      tile.source.file !== COVE_TILES_FRONT
    )
      ctx.addIssue({ code: "custom", message: "背面来源未核准时不应标 verified" });
    if (tile.source.status === "verified" && tile.printedRoomNumber !== tile.number)
      ctx.addIssue({ code: "custom", message: "已核准印刷面房间号必须与 number 一致" });
    if (tile.source.status === "pending" && tile.printedRoomNumber !== null)
      ctx.addIssue({ code: "custom", message: "待确认来源不得写入已解析房间号" });
  });

export const coveNormalRoomTileCatalogSchema = coveTileBase.safeExtend({
  number: z.int().min(1).max(9),
  boss: z.literal(false),
  poolEligible: z.literal(true),
});

export const coveBossRoomTileCatalogSchema = coveTileBase.safeExtend({
  number: z.int().min(10).max(12),
  boss: z.literal(true),
  poolEligible: z.literal(false),
  classificationEvidence: z.array(z.string()).min(1),
});

export const coveRoomTileCatalogEntrySchema = z.discriminatedUnion("boss", [
  coveNormalRoomTileCatalogSchema,
  coveBossRoomTileCatalogSchema,
]);

export const coveRoomTileCatalogFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-room-tile-catalog-v0"),
    category: z.literal("cove_room_tile_catalog"),
    sources: z.strictObject({
      front: z.literal(COVE_TILES_FRONT),
      back: z.null(),
      backPending: z.literal("盒内未见 DD_COVE_TILES_BACK.pdf；背面板块待 Kyries 提供印刷面后核准"),
    }),
    tiles: z
      .array(coveRoomTileCatalogEntrySchema)
      .length(12)
      .refine((tiles) => new Set(tiles.map((t) => t.id)).size === 12, "十二张板块身份不可重复"),
  })
  .superRefine((file, ctx) => {
    const numbers = file.tiles.map((t) => t.number).sort((a, b) => a - b);
    if (numbers.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12")
      ctx.addIssue({ code: "custom", message: "必须覆盖 Cove 1–12 号板块身份" });
    if (file.tiles.filter((t) => !t.boss).length !== 9)
      ctx.addIssue({ code: "custom", message: "必须恰好九张普通板块登记" });
    if (file.tiles.filter((t) => t.boss).length !== 3)
      ctx.addIssue({ code: "custom", message: "必须恰好三张 Boss 板块登记" });
    const verifiedFaces = file.tiles.filter((t) => t.source.status === "verified");
    if (verifiedFaces.length !== 6)
      ctx.addIssue({ code: "custom", message: "FRONT 六页仅核准六张正面板块" });
    for (const tile of verifiedFaces) {
      if (tile.source.status !== "verified" || tile.source.face !== "front")
        ctx.addIssue({ code: "custom", message: "当前仅 FRONT 六页可 verified" });
    }
  });

export type CoveRoomTileCatalogEntry = z.infer<typeof coveRoomTileCatalogEntrySchema>;
