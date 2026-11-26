import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";

export const WEALD_TILES_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_WEALD_TILES_FRONT.pdf";
export const WEALD_TILES_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_WEALD_TILES_BACK.pdf";

export const wealdSpecialEffectSchema = z.enum([
  "precious",
  "poisonousRoots",
  "clearingHere",
  "clearingOurs",
  "abyssalPuff",
  "unprepared",
  "toxicMushrooms",
]);

const deploymentSchema = z.strictObject({
  printReview: z.literal("verified"),
  heroes: z.strictObject({
    aggressive: z.string(),
    defensive: z.string(),
    ranged: z.string(),
    support: z.string(),
  }),
  monsters: z.strictObject({
    aggressive: z.string(),
    defensive: z.string(),
    ranged: z.string(),
    support: z.string(),
  }),
  lootAreas: z.array(z.string()),
  markers: z.array(
    z.strictObject({
      areaId: z.string(),
      iconId: iconIdSchema,
      semantic: z.string(),
      status: z.literal("confirmed"),
    }),
  ),
});

/** 普通房间与独立 Boss 目录共用的几何结构及引用校验。 */
export const wealdRoomTileBaseSchema = z
  .strictObject({
    id: z.string().regex(/^room_tile:weald:\d{2}$/),
    rawId: z.string().regex(/^dungeon_tile:weald:p\d{3}$/),
    roomId: z.string().regex(/^room:weald:\d{2}$/),
    location: z.literal("weald"),
    number: z.int().min(1).max(12),
    name: z.string().min(1),
    source: z.strictObject({
      file: z.string().min(1),
      page: z.int().min(1).max(6),
      face: z.enum(["front", "back"]),
    }),
    ruling: z.enum([
      "R-234",
      "R-235",
      "R-236",
      "R-237",
      "R-238",
      "R-239",
      "R-254",
      "R-258",
      "R-261",
    ]),
    geometryVerified: z.boolean(),
    geometryComplete: z.boolean(),
    usable: z.literal(false),
    pendingReview: z.array(z.string()),
    deployment: deploymentSchema,
    areas: z
      .array(
        z.strictObject({
          id: z.string(),
          capacity: z.int().nonnegative(),
          elevation: z.enum(["low", "normal", "high"]),
          zeroCapacity: z.boolean().optional(),
        }),
      )
      .min(1),
    edges: z.array(
      z.strictObject({
        from: z.string(),
        to: z.string(),
        cornerOnly: z.boolean(),
        blocked: z.boolean(),
      }),
    ),
    necroticFungusAreas: z.array(z.string()),
    zeroCapacityAreas: z.array(z.string()),
    specialRegions: z.array(
      z.strictObject({
        areaId: z.string(),
        iconId: iconIdSchema,
        effect: wealdSpecialEffectSchema,
        status: z.literal("confirmed"),
        printedText: z.string(),
        runtimeReady: z.boolean(),
      }),
    ),
    wallNotes: z.array(z.string()),
    unresolvedMarkers: z.array(z.never()),
  })
  .superRefine((tile, ctx) => {
    const expectedRoomId = `room:weald:${String(tile.number).padStart(2, "0")}`;
    if (
      tile.roomId !== expectedRoomId ||
      tile.id !== `room_tile:weald:${String(tile.number).padStart(2, "0")}`
    )
      ctx.addIssue({ code: "custom", message: "板块 ID / roomId 必须与 number 一致" });
    const sourceFile = tile.source.face === "front" ? WEALD_TILES_FRONT : WEALD_TILES_BACK;
    const rawId = `dungeon_tile:weald:p${String(tile.source.page).padStart(3, "0")}`;
    if (tile.source.file !== sourceFile || tile.rawId !== rawId)
      ctx.addIssue({ code: "custom", message: "板块 rawId、印刷页或来源面不一致" });
    for (const region of tile.specialRegions) {
      if (
        region.runtimeReady &&
        !["poisonousRoots", "toxicMushrooms", "precious"].includes(region.effect)
      )
        ctx.addIssue({
          code: "custom",
          message: `特效 ${region.effect} 尚未允许 runtimeReady（R-048）`,
        });
      if (
        region.runtimeReady &&
        region.effect === "poisonousRoots" &&
        (tile.roomId !== "room:weald:05" || tile.number !== 5)
      )
        ctx.addIssue({
          code: "custom",
          message: "Poisonous Roots 仅 Infected Oak 5 号板块可 runtimeReady",
        });
    }
    if (
      tile.specialRegions.some((r) => r.runtimeReady && r.effect === "toxicMushrooms") &&
      (tile.roomId !== "room:weald:01" || tile.number !== 1)
    )
      ctx.addIssue({
        code: "custom",
        message: "Toxic Mushrooms 仅 Fungal Spores 1 号板块可 runtimeReady",
      });
    if (
      tile.specialRegions.some((r) => r.runtimeReady && r.effect === "precious") &&
      (tile.roomId !== "room:weald:04" || tile.number !== 4)
    )
      ctx.addIssue({ code: "custom", message: "Precious 仅 Stash 4 号板块可 runtimeReady" });
    const ids = new Set(tile.areas.map((a) => a.id));
    if (ids.size !== tile.areas.length) ctx.addIssue({ code: "custom", message: "区域 ID 重复" });
    for (const areaId of [
      ...tile.necroticFungusAreas,
      ...tile.zeroCapacityAreas,
      ...tile.deployment.markers.map((marker) => marker.areaId),
      ...tile.specialRegions.map((region) => region.areaId),
    ])
      if (!ids.has(areaId)) ctx.addIssue({ code: "custom", message: "板块标记或特效引用未知区域" });
    for (const edge of tile.edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to)
        ctx.addIssue({ code: "custom", message: "边引用未知区域" });
    }
    for (const placement of [
      tile.deployment.heroes.aggressive,
      tile.deployment.heroes.defensive,
      tile.deployment.heroes.ranged,
      tile.deployment.heroes.support,
      tile.deployment.monsters.aggressive,
      tile.deployment.monsters.defensive,
      tile.deployment.monsters.ranged,
      tile.deployment.monsters.support,
      ...tile.deployment.lootAreas,
    ])
      if (!ids.has(placement)) ctx.addIssue({ code: "custom", message: "部署引用未知区域" });
    for (const zid of tile.zeroCapacityAreas) {
      const area = tile.areas.find((a) => a.id === zid);
      if (area && area.capacity !== 0)
        ctx.addIssue({ code: "custom", message: "零容量区容量必须为 0" });
    }
    if (tile.geometryComplete && tile.pendingReview.length)
      ctx.addIssue({ code: "custom", message: "完整几何不能挂待审项" });
    if (!tile.geometryComplete && tile.pendingReview.length === 0)
      ctx.addIssue({ code: "custom", message: "不完整几何必须显式保留待审" });
    if (tile.number === 7 && tile.geometryComplete) {
      const pair = (a: string, b: string) =>
        tile.edges.some(
          (e) =>
            !e.cornerOnly &&
            !e.blocked &&
            ((e.from === a && e.to === b) || (e.from === b && e.to === a)),
        );
      if (pair("D", "G")) ctx.addIssue({ code: "custom", message: "7 号 D–G 不得直连，须经 J" });
    }
  });

/** 普通目录仍严格限制在 1–9 号及原有核准范围。 */
export const wealdRoomTileSchema = wealdRoomTileBaseSchema.safeExtend({
  number: z.int().min(1).max(9),
  ruling: z.enum(["R-234", "R-235", "R-236", "R-237", "R-238", "R-239"]),
});

export const wealdRoomTileGeometryFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-room-tile-geometry-v0"),
    category: z.literal("weald_room_tile_geometry"),
    tiles: z
      .array(wealdRoomTileSchema)
      .length(9)
      .refine((tiles) => new Set(tiles.map((t) => t.id)).size === 9, "九张板块面不可重复"),
  })
  .superRefine((file, ctx) => {
    const numbers = file.tiles.map((t) => t.number).sort((a, b) => a - b);
    if (numbers.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须覆盖 1–9 号板块" });
    if (
      new Set(file.tiles.map((tile) => `${tile.rawId}:${tile.source.face}`)).size !==
      file.tiles.length
    )
      ctx.addIssue({ code: "custom", message: "不可重复使用同一印刷板块面" });
  });

export type WealdRoomTile = z.infer<typeof wealdRoomTileSchema>;
