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
  id: z.literal("room_tile:ruins:11"),
  rawId: z.literal("dungeon_tile:p006"),
  roomId: z.literal("room:ruins:11"),
  location: z.literal("ruins"),
  number: z.literal(11),
  name: z.literal("Prophet Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(6),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-167"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:ruins:11"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(11),
    ruling: z.literal("R-167"),
  }),
  specialRegions: z.array(z.never()),
  printedMarkers: z.array(
    z.strictObject({
      areaId: z.string(),
      iconId: z.literal("99be282315"),
      color: z.literal("orange"),
      printedRange: z.string(),
      status: z.literal("confirmed"),
    }),
  ),
  deployment: z.strictObject({
    printReview: z.literal("verified"),
    heroes: placements,
    monsters: z.strictObject({ aggressive: z.literal("E") }),
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

// R-167仅批准图面，Boss运行时准入仍单独核实。
export const approvedProphetRoom = tileShape.parse({
  id: "room_tile:ruins:11",
  rawId: "dungeon_tile:p006",
  roomId: "room:ruins:11",
  location: "ruins",
  number: 11,
  name: "Prophet Room",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 6, face: "front" },
  ruling: "R-167",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:ruins:11", file: ROOM_FRONT, page: 11, ruling: "R-167" },
  specialRegions: [],
  printedMarkers: [
    {
      areaId: "A",
      iconId: "99be282315",
      color: "orange",
      printedRange: "1-2",
      status: "confirmed",
    },
    { areaId: "B", iconId: "99be282315", color: "orange", printedRange: "3", status: "confirmed" },
    { areaId: "C", iconId: "99be282315", color: "orange", printedRange: "4", status: "confirmed" },
    { areaId: "D", iconId: "99be282315", color: "orange", printedRange: "5", status: "confirmed" },
    { areaId: "E", iconId: "99be282315", color: "orange", printedRange: "6", status: "confirmed" },
    {
      areaId: "F",
      iconId: "99be282315",
      color: "orange",
      printedRange: "7-8",
      status: "confirmed",
    },
    { areaId: "G", iconId: "99be282315", color: "orange", printedRange: "9", status: "confirmed" },
    { areaId: "H", iconId: "99be282315", color: "orange", printedRange: "10", status: "confirmed" },
  ],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "C", defensive: "H", ranged: "H", support: "D" },
    monsters: { aggressive: "E" },
    lootAreas: [],
    markers: [
      ["C", "7b8c742c86", "hero_aggressive_start"],
      ["H", "1a71d94723", "hero_defensive_start"],
      ["H", "7ab26866fc", "hero_ranged_start"],
      ["D", "39d6ddf024", "hero_support_start"],
      ["E", "8787ebb1b2", "monster_aggressive_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [4, 3, 3, 3, 3, 4, 3, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: "normal",
  })),
  edges: [
    ..."A-B A-D B-C B-E C-F D-E D-G D-H E-F E-H F-H G-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."A-E B-F C-E"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedProphetRoom);
export const prophetRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-167获批几何、部署或来源漂移" });
});
