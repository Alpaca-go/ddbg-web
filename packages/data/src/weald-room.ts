import { z } from "zod";
import { iconIdSchema } from "./extract/common";

export const WEALD_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_FRONT.pdf";
export const WEALD_ROOM_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_BACK.pdf";
export const WEALD_TILES_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_WEALD_TILES_FRONT.pdf";
export const WEALD_TILES_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_WEALD_TILES_BACK.pdf";

const verifiedEffectSchema = z.strictObject({
  ruling: z.enum(["R-234", "R-237", "R-238", "R-239"]),
  summary: z.string().min(1),
  runtimeReady: z.literal(false),
  effectAreaBinding: z.enum(["pending", "partial", "confirmed"]),
});

export const wealdRoomCardSchema = z
  .strictObject({
    id: z.string().regex(/^room:weald:p\d{3}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("weald"),
    number: z.int().min(1).max(9),
    boss: z.literal(false),
    printedLines: z.array(z.string()).min(1),
    source: z.strictObject({
      front: z.literal(WEALD_ROOM_FRONT),
      back: z.literal(WEALD_ROOM_BACK),
      page: z.int().min(1).max(9),
    }),
    verifiedEffect: verifiedEffectSchema.nullable(),
    pendingReview: z.array(z.string()),
  })
  .superRefine((card, ctx) => {
    const expected = `room:weald:p${String(card.source.page).padStart(3, "0")}`;
    if (card.id !== expected || card.number !== card.source.page)
      ctx.addIssue({ code: "custom", message: "Weald 普通房间身份与印刷页不一致" });
  });

export const wealdRoomFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-room-v1"),
    cards: z
      .array(wealdRoomCardSchema)
      .length(9)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张普通房间不可重复"),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须包含 p1–p9 九张普通房间" });
  });

export type WealdRoomCard = z.infer<typeof wealdRoomCardSchema>;

/** 九张核准 Weald 普通房间目录；沙盒出征接线用，不改变 `usable` 战役闸门。 */
export const wealdRoomCatalogSchema = z
  .array(wealdRoomCardSchema)
  .length(9)
  .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Weald 普通房间不可重复");

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

export const wealdRoomTileSchema = z
  .strictObject({
    id: z.string().regex(/^room_tile:weald:p\d{3}:(?:front|back)$/),
    rawId: z.string().regex(/^dungeon_tile:weald:p\d{3}$/),
    roomId: z.string().regex(/^room:weald:p\d{3}$/),
    location: z.literal("weald"),
    number: z.int().min(1).max(9),
    name: z.string().min(1),
    source: z.strictObject({
      file: z.string().min(1),
      page: z.int().min(1).max(6),
      face: z.enum(["front", "back"]),
    }),
    ruling: z.enum(["R-234", "R-235", "R-236", "R-237", "R-238", "R-239"]),
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
        runtimeReady: z.literal(false),
      }),
    ),
    wallNotes: z.array(z.string()),
    unresolvedMarkers: z.array(z.never()),
  })
  .superRefine((tile, ctx) => {
    const ids = new Set(tile.areas.map((a) => a.id));
    if (ids.size !== tile.areas.length) ctx.addIssue({ code: "custom", message: "区域 ID 重复" });
    for (const areaId of [...tile.necroticFungusAreas, ...tile.zeroCapacityAreas])
      if (!ids.has(areaId)) ctx.addIssue({ code: "custom", message: "真菌／零容量引用未知区域" });
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
    for (const tile of file.tiles)
      if (tile.roomId !== `room:weald:p${String(tile.number).padStart(3, "0")}`)
        ctx.addIssue({ code: "custom", message: "板块与房间编号不一致" });
  });

export type WealdRoomTile = z.infer<typeof wealdRoomTileSchema>;
