import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import { ROOM_FRONT } from "./room";

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:ruins:12"),
  rawId: z.literal("dungeon_tile:p007"),
  roomId: z.literal("room:ruins:12"),
  location: z.literal("ruins"),
  number: z.literal(12),
  name: z.literal("Collector Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(7),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-168"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:ruins:12"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(12),
    ruling: z.literal("R-168"),
  }),
  specialRegions: z.array(z.never()),
  printedLoot: z.strictObject({
    areaId: z.literal("F"),
    count: z.literal(3),
    iconId: z.literal("f9f205b9e1"),
    overlayIconId: z.literal("6c5de8d976"),
    printedOverlay: z.literal("!"),
    runtimeReady: z.literal(true),
  }),
  deployment: z.strictObject({
    printReview: z.literal("verified"),
    heroes: placements,
    monsters: placements,
    lootAreas: z.array(z.string()),
    markers: z.array(
      z.strictObject({
        areaId: z.string(),
        iconId: iconIdSchema,
        semantic: z.string(),
        status: z.literal("confirmed"),
      }),
    ),
  }),
  areas: z.array(
    z.strictObject({
      id: z.string(),
      capacity: z.int().positive(),
      elevation: z.enum(["normal", "high", "low"]),
    }),
  ),
  edges: z.array(
    z.strictObject({
      from: z.string(),
      to: z.string(),
      cornerOnly: z.boolean(),
      blocked: z.boolean(),
    }),
  ),
  unresolvedMarkers: z.array(
    z.strictObject({
      areaId: z.string(),
      iconId: iconIdSchema,
      semantic: z.null(),
    }),
  ),
});

// R-168图面；F区三宝箱交互见 R-177。Boss准入与 room usable 仍单独核实。
export const approvedCollectorRoom = tileShape.parse({
  id: "room_tile:ruins:12",
  rawId: "dungeon_tile:p007",
  roomId: "room:ruins:12",
  location: "ruins",
  number: 12,
  name: "Collector Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 7, face: "back" },
  ruling: "R-168",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:ruins:12", file: ROOM_FRONT, page: 12, ruling: "R-168" },
  specialRegions: [],
  printedLoot: {
    areaId: "F",
    count: 3,
    iconId: "f9f205b9e1",
    overlayIconId: "6c5de8d976",
    printedOverlay: "!",
    runtimeReady: true,
  },
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "H", defensive: "B", ranged: "B", support: "H" },
    monsters: { aggressive: "C", defensive: "G", ranged: "E", support: "A" },
    lootAreas: ["F", "F", "F"],
    markers: [
      ["H", "7b8c742c86", "hero_aggressive_start"],
      ["B", "1a71d94723", "hero_defensive_start"],
      ["B", "7ab26866fc", "hero_ranged_start"],
      ["H", "39d6ddf024", "hero_support_start"],
      ["C", "8787ebb1b2", "monster_aggressive_start"],
      ["G", "1f26dc63eb", "monster_defensive_start"],
      ["E", "643d396fef", "monster_ranged_start"],
      ["A", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [2, 3, 3, 2, 2, 2, 2, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: "normal",
  })),
  edges: [
    ..."A-C B-D C-D C-E C-G E-F G-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-C C-F C-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedCollectorRoom);
export const collectorRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-168获批几何、部署或来源漂移" });
});
