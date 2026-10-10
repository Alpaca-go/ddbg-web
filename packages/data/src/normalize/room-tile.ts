import { z } from "zod";
import type { RawFile } from "../extract/raw";
import { iconIdSchema } from "../extract/common";

/** 几何数据不是可用卡池；未命名图标只保留 ID，不补含义或数值（R-048）。 */
export const roomTileGeometrySchema = z
  .strictObject({
    id: z.string().min(1),
    rawId: z.string().min(1),
    name: z.string().min(1),
    source: z.strictObject({
      file: z.string().min(1),
      page: z.int().positive(),
      face: z.literal("front"),
    }),
    ruling: z.literal("R-054"),
    geometryVerified: z.literal(true),
    usable: z.literal(false),
    deployment: z
      .strictObject({
        ruling: z.literal("R-055"),
        printReview: z.literal("pending"),
        heroes: z.strictObject({
          aggressive: z.literal("H"),
          ranged: z.literal("H"),
          defensive: z.literal("C"),
          support: z.literal("C"),
        }),
        monsters: z.strictObject({
          aggressive: z.literal("J"),
          defensive: z.literal("D"),
          support: z.literal("D"),
          ranged: z.literal("F"),
        }),
        lootAreas: z.tuple([z.literal("C"), z.literal("H")]),
        provisionalMarkers: z
          .array(
            z.strictObject({
              areaId: z.string().min(1),
              iconId: iconIdSchema,
              semantic: z.enum(["hero_support_start", "monster_support_start", "cornered"]),
              status: z.literal("provisional"),
            }),
          )
          .length(4),
      })
      .optional(),
    areas: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          capacity: z.int().nonnegative(),
          elevation: z.enum(["low", "normal", "high"]),
        }),
      )
      .min(1),
    edges: z.array(
      z.strictObject({
        from: z.string().min(1),
        to: z.string().min(1),
        cornerOnly: z.boolean(),
        blocked: z.boolean(),
      }),
    ),
    unresolvedMarkers: z.array(
      z.strictObject({ areaId: z.string().min(1), iconId: iconIdSchema, semantic: z.null() }),
    ),
  })
  .superRefine((tile, ctx) => {
    const ids = new Set(tile.areas.map((area) => area.id));
    const pairs = new Set<string>();
    if (ids.size !== tile.areas.length) ctx.addIssue({ code: "custom", message: "区域 ID 重复" });
    for (const edge of tile.edges) {
      const key = JSON.stringify([edge.from, edge.to].sort());
      if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || pairs.has(key))
        ctx.addIssue({ code: "custom", message: "边必须引用不同的已知区域，且不能重复" });
      pairs.add(key);
    }
    if (tile.unresolvedMarkers.some((marker) => !ids.has(marker.areaId)))
      ctx.addIssue({ code: "custom", message: "标记引用未知区域" });
  });

export const roomTileGeometryFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-room-tile-geometry-v0"),
    category: z.literal("room_tile_geometry"),
    tiles: z.array(roomTileGeometrySchema),
  })
  .superRefine((file, ctx) => {
    if (
      new Set(file.tiles.map((tile) => tile.id)).size !== file.tiles.length ||
      new Set(file.tiles.map((tile) => tile.rawId)).size !== file.tiles.length
    )
      ctx.addIssue({ code: "custom", message: "板块 / raw ID 重复" });
  });

export type RoomTileGeometryFile = z.infer<typeof roomTileGeometryFileSchema>;

/** Kyries 2026-10-10 批准核对表，E-F 黑墙不相邻（R-054）；只有这一面。 */
export const approvedRoomTileGeometry = roomTileGeometrySchema.parse({
  id: "room_tile:p001",
  rawId: "dungeon_tile:p001",
  name: "Ritual Chamber",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 1, face: "front" },
  ruling: "R-054",
  geometryVerified: true,
  usable: false,
  deployment: {
    ruling: "R-055",
    printReview: "pending",
    heroes: { aggressive: "H", ranged: "H", defensive: "C", support: "C" },
    monsters: { aggressive: "J", defensive: "D", support: "D", ranged: "F" },
    lootAreas: ["C", "H"],
    provisionalMarkers: [
      { areaId: "C", iconId: "39d6ddf024", semantic: "hero_support_start", status: "provisional" },
      {
        areaId: "D",
        iconId: "293f170eab",
        semantic: "monster_support_start",
        status: "provisional",
      },
      { areaId: "C", iconId: "4591aebebd", semantic: "cornered", status: "provisional" },
      { areaId: "H", iconId: "4591aebebd", semantic: "cornered", status: "provisional" },
    ],
  },
  areas: [
    { id: "A", capacity: 4, elevation: "normal" },
    { id: "B", capacity: 3, elevation: "normal" },
    { id: "C", capacity: 3, elevation: "normal" },
    { id: "D", capacity: 3, elevation: "normal" },
    { id: "E", capacity: 3, elevation: "normal" },
    { id: "F", capacity: 2, elevation: "high" },
    { id: "G", capacity: 3, elevation: "normal" },
    { id: "H", capacity: 2, elevation: "normal" },
    { id: "I", capacity: 3, elevation: "normal" },
    { id: "J", capacity: 2, elevation: "normal" },
  ],
  edges: [
    ...[
      ["A", "B"],
      ["A", "D"],
      ["A", "E"],
      ["B", "C"],
      ["C", "E"],
      ["C", "G"],
      ["D", "E"],
      ["D", "H"],
      ["G", "J"],
      ["H", "I"],
      ["I", "J"],
    ].map(([from, to]) => ({ from, to, cornerOnly: false, blocked: false })),
    { from: "E", to: "F", cornerOnly: false, blocked: true },
    ...[
      ["D", "I"],
      ["E", "G"],
      ["G", "I"],
    ].map(([from, to]) => ({ from, to, cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [
    { areaId: "C", iconId: "39d6ddf024", semantic: null },
    { areaId: "D", iconId: "293f170eab", semantic: null },
    { areaId: "C", iconId: "4591aebebd", semantic: null },
    { areaId: "H", iconId: "4591aebebd", semantic: null },
  ],
});

/** 不解析颜色 / 图标计数 / footer；未获批 raw 页不输出几何。 */
export function buildRoomTileGeometry(raw: RawFile): RoomTileGeometryFile {
  const tile = roomTileGeometrySchema.parse(approvedRoomTileGeometry);
  const matches = raw.cards.filter((card) => card.id === tile.rawId);
  const card = matches[0];
  if (
    raw.category !== "dungeon_tile" ||
    raw.kind !== "sheet" ||
    matches.length !== 1 ||
    !card ||
    card.source_set !== "base" ||
    card.pages.length !== 1 ||
    card.pages[0] !== 1 ||
    card.faces.front.file !== tile.source.file ||
    card.faces.front.page !== tile.source.page ||
    !card.faces.front.spans.some((span) => span.t === "1")
  )
    throw new Error("获批 Room Tile 的 raw ID / 来源 / 页码 / 编号漂移，拒绝生成");
  for (const marker of tile.unresolvedMarkers) {
    if (!card.faces.front.icons.some((icon) => icon.iconId === marker.iconId))
      throw new Error("未确认标记在来源页缺失，拒绝生成");
  }
  return roomTileGeometryFileSchema.parse({
    schema: "ddbg-room-tile-geometry-v0",
    category: "room_tile_geometry",
    tiles: [tile],
  });
}
