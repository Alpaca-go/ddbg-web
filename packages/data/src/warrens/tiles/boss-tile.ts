import { z } from "zod";
import { WARRENS_TILES_BACK, WARRENS_TILES_FRONT } from "../print";

const pendingDeploymentSchema = z.strictObject({
  printReview: z.literal("pending"),
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
  markers: z.array(z.never()),
});

/** Boss 板块占位：几何未核准前仅登记来源与规则书部署槽，不接入探索 underlay。 */
export const warrensBossTileStubSchema = z
  .strictObject({
    id: z.enum(["room_tile:warrens:10", "room_tile:warrens:11", "room_tile:warrens:12"]),
    rawId: z.string().regex(/^dungeon_tile:warrens:p\d{3}$/),
    roomId: z.enum(["room:warrens:10", "room:warrens:11", "room:warrens:12"]),
    location: z.literal("warrens"),
    number: z.int().min(10).max(12),
    name: z.string().min(1),
    source: z.strictObject({
      file: z.literal(WARRENS_TILES_FRONT),
      back: z.literal(WARRENS_TILES_BACK),
      page: z.int().positive(),
      face: z.enum(["front", "back"]),
    }),
    geometryVerified: z.literal(false),
    geometryComplete: z.literal(false),
    usable: z.literal(false),
    pendingReview: z.array(z.string()).min(1),
    deployment: pendingDeploymentSchema,
    areas: z.array(z.never()),
    edges: z.array(z.never()),
    necroticFungusAreas: z.array(z.never()),
    zeroCapacityAreas: z.array(z.never()),
    specialRegions: z.array(z.never()),
    wallNotes: z.array(z.string()),
    unresolvedMarkers: z.array(z.string()).min(1),
  })
  .superRefine((tile, ctx) => {
    const expectedRoom = `room:warrens:${String(tile.number).padStart(2, "0")}`;
    if (
      tile.roomId !== expectedRoom ||
      tile.id !== `room_tile:warrens:${String(tile.number).padStart(2, "0")}`
    )
      ctx.addIssue({ code: "custom", message: "Warrens Boss 板块 roomId/number 不一致" });
  });

export type WarrensBossTileStub = z.infer<typeof warrensBossTileStubSchema>;
