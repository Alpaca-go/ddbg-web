import { z } from "zod";
import type { RawFile } from "../extract/raw";
import { iconIdSchema } from "../extract/common";
import { approvedTortureChamber, tortureChamberSchema } from "./torture-chamber";
import { approvedExtraRuinsTileSchema, approvedExtraRuinsTiles } from "./approved-ruins-tiles";

/** 几何数据不是可用卡池；未命名图标只保留 ID，不补含义或数值（R-048）。 */
const ritualChamberSchema = z
  .strictObject({
    id: z.literal("room_tile:p001"),
    roomId: z.literal("room:p001"),
    location: z.literal("ruins"),
    number: z.literal(1),
    rawId: z.string().min(1),
    name: z.string().min(1),
    source: z.strictObject({
      file: z.string().min(1),
      page: z.int().positive(),
      face: z.literal("front"),
    }),
    ruling: z.literal("R-054"),
    geometryVerified: z.literal(true),
    usable: z.boolean(),
    deployment: z
      .strictObject({
        ruling: z.literal("R-055"),
        printReview: z.enum(["pending", "verified"]),
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
        markers: z
          .array(
            z.strictObject({
              areaId: z.string().min(1),
              iconId: iconIdSchema,
              semantic: z.enum(["hero_support_start", "monster_support_start", "cornered"]),
              status: z.enum(["provisional", "confirmed"]),
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
    const approved = Boolean(
      tile.deployment?.printReview === "verified" &&
      tile.deployment.markers.every((marker) => marker.status === "confirmed") &&
      tile.unresolvedMarkers.length === 0,
    );
    if (tile.usable !== approved)
      ctx.addIssue({ code: "custom", message: "usable 必须与完整印刷复核 / 标记确认一致" });
    if (tile.deployment?.markers.some((marker) => !ids.has(marker.areaId)))
      ctx.addIssue({ code: "custom", message: "部署标记引用未知区域" });
    const placements = new Set([
      "C:39d6ddf024:hero_support_start",
      "D:293f170eab:monster_support_start",
      "C:4591aebebd:cornered",
      "H:4591aebebd:cornered",
    ]);
    if (
      tile.deployment &&
      (new Set(
        tile.deployment.markers.map(
          (marker) => `${marker.areaId}:${marker.iconId}:${marker.semantic}`,
        ),
      ).size !== 4 ||
        tile.deployment.markers.some(
          (marker) => !placements.has(`${marker.areaId}:${marker.iconId}:${marker.semantic}`),
        ))
    )
      ctx.addIssue({ code: "custom", message: "R-055 标记限定放置漂移" });
  });

export const roomTileGeometrySchema = z.union([
  ritualChamberSchema,
  tortureChamberSchema,
  approvedExtraRuinsTileSchema,
]);

export const roomTileGeometryFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-room-tile-geometry-v0"),
    category: z.literal("room_tile_geometry"),
    tiles: z.array(roomTileGeometrySchema),
  })
  .superRefine((file, ctx) => {
    if (
      new Set(file.tiles.map((tile) => tile.id)).size !== file.tiles.length ||
      new Set(file.tiles.map((tile) => `${tile.rawId}:${tile.source.face}`)).size !==
        file.tiles.length
    )
      ctx.addIssue({ code: "custom", message: "板块 ID / raw 同面重复" });
  });

export type RoomTileGeometryFile = z.infer<typeof roomTileGeometryFileSchema>;

/** Kyries 2026-10-10 批准核对表，E-F 黑墙不相邻（R-054）；只有这一面。 */
export const approvedRoomTileGeometry = ritualChamberSchema.parse({
  id: "room_tile:p001",
  roomId: "room:p001",
  location: "ruins",
  number: 1,
  rawId: "dungeon_tile:p001",
  name: "Ritual Chamber",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 1, face: "front" },
  ruling: "R-054",
  geometryVerified: true,
  usable: true,
  deployment: {
    ruling: "R-055",
    printReview: "verified",
    heroes: { aggressive: "H", ranged: "H", defensive: "C", support: "C" },
    monsters: { aggressive: "J", defensive: "D", support: "D", ranged: "F" },
    lootAreas: ["C", "H"],
    markers: [
      { areaId: "C", iconId: "39d6ddf024", semantic: "hero_support_start", status: "confirmed" },
      {
        areaId: "D",
        iconId: "293f170eab",
        semantic: "monster_support_start",
        status: "confirmed",
      },
      { areaId: "C", iconId: "4591aebebd", semantic: "cornered", status: "confirmed" },
      { areaId: "H", iconId: "4591aebebd", semantic: "cornered", status: "confirmed" },
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
  unresolvedMarkers: [],
});

/** 不解析颜色 / 图标计数 / footer；未获批 raw 页不输出几何。 */
export function buildRoomTileGeometry(raw: RawFile): RoomTileGeometryFile {
  const tiles = [approvedRoomTileGeometry, approvedTortureChamber, ...approvedExtraRuinsTiles];
  for (const tile of tiles) {
    const matches = raw.cards.filter((card) => card.id === tile.rawId);
    const card = matches[0];
    const face = card?.faces[tile.source.face];
    if (
      raw.category !== "dungeon_tile" ||
      raw.kind !== "sheet" ||
      matches.length !== 1 ||
      !card ||
      card.source_set !== "base" ||
      card.pages.length !== 1 ||
      card.pages[0] !== tile.source.page ||
      !face ||
      face.file !== tile.source.file ||
      face.page !== tile.source.page ||
      !face.spans.some((span) => span.t === ("number" in tile ? String(tile.number) : "1"))
    )
      throw new Error("获批 Room Tile 的 raw ID / 来源 / 页码 / 编号漂移，拒绝生成");
    for (const marker of [
      ...tile.unresolvedMarkers,
      ...(tile.deployment?.markers ?? []),
      ...("specialRegions" in tile ? tile.specialRegions : []),
    ]) {
      if (!face.icons.some((icon) => icon.iconId === marker.iconId))
        throw new Error("未确认标记在来源页缺失，拒绝生成");
    }
  }
  return roomTileGeometryFileSchema.parse({
    schema: "ddbg-room-tile-geometry-v0",
    category: "room_tile_geometry",
    tiles,
  });
}
