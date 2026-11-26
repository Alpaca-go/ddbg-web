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
  id: z.literal("room_tile:darkest:12"),
  rawId: z.literal("dungeon_tile:p014"),
  roomId: z.literal("room:darkest:12"),
  location: z.literal("darkestDungeon"),
  number: z.literal(12),
  name: z.literal("Ancestor Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(14),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-165"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:12"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(25),
    ruling: z.literal("R-165"),
  }),
  specialRegions: z.array(z.never()),
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

// R-165仅批准图面，最终战形态切换与Boss运行时准入仍单独核实。
export const approvedAncestorRoom = tileShape.parse({
  id: "room_tile:darkest:12",
  rawId: "dungeon_tile:p014",
  roomId: "room:darkest:12",
  location: "darkestDungeon",
  number: 12,
  name: "Ancestor Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 14, face: "back" },
  ruling: "R-165",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:darkest:12", file: ROOM_FRONT, page: 25, ruling: "R-165" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "K", defensive: "I", ranged: "K", support: "C" },
    monsters: { aggressive: "E", defensive: "B", ranged: "A", support: "J" },
    lootAreas: [],
    markers: [
      ["K", "7b8c742c86", "hero_aggressive_start"],
      ["I", "1a71d94723", "hero_defensive_start"],
      ["K", "7ab26866fc", "hero_ranged_start"],
      ["C", "39d6ddf024", "hero_support_start"],
      ["E", "8787ebb1b2", "monster_aggressive_start"],
      ["B", "1f26dc63eb", "monster_defensive_start"],
      ["A", "643d396fef", "monster_ranged_start"],
      ["J", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [3, 4, 2, 3, 3, 3, 3, 3, 2, 4, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: "normal",
  })),
  edges: [
    ..."A-B A-D B-C B-E B-F C-F D-E D-G E-F E-G E-H F-H G-I G-J H-J H-K I-J J-K"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-D E-J"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedAncestorRoom);
export const ancestorRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-165获批几何、部署或来源漂移" });
});
