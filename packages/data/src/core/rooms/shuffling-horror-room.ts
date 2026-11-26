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
  id: z.literal("room_tile:darkest:10"),
  rawId: z.literal("dungeon_tile:p013"),
  roomId: z.literal("room:darkest:10"),
  location: z.literal("darkestDungeon"),
  number: z.literal(10),
  name: z.literal("Shuffling Horror Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(13),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-163"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:10"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(23),
    ruling: z.literal("R-163"),
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

// R-163仅批准印刷几何，Boss运行时准入仍单独核实。
export const approvedShufflingHorrorRoom = tileShape.parse({
  id: "room_tile:darkest:10",
  rawId: "dungeon_tile:p013",
  roomId: "room:darkest:10",
  location: "darkestDungeon",
  number: 10,
  name: "Shuffling Horror Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 13, face: "back" },
  ruling: "R-163",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:darkest:10", file: ROOM_FRONT, page: 23, ruling: "R-163" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "G", defensive: "I", ranged: "I", support: "B" },
    monsters: { aggressive: "H", defensive: "H", ranged: "D", support: "C" },
    lootAreas: [],
    markers: [
      ["G", "7b8c742c86", "hero_aggressive_start"],
      ["I", "1a71d94723", "hero_defensive_start"],
      ["I", "7ab26866fc", "hero_ranged_start"],
      ["B", "39d6ddf024", "hero_support_start"],
      ["H", "8787ebb1b2", "monster_aggressive_start"],
      ["H", "1f26dc63eb", "monster_defensive_start"],
      ["D", "643d396fef", "monster_ranged_start"],
      ["C", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [2, 3, 2, 3, 3, 3, 3, 3, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: i === 0 || i === 2 ? "high" : "normal",
  })),
  edges: [
    ..."A-D B-E C-F D-E D-G E-F F-I G-H H-I"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-D B-F D-H F-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedShufflingHorrorRoom);
export const shufflingHorrorRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-163获批几何、部署或来源漂移" });
});
