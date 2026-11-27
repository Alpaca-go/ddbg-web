import { printIcon, printSourceIcon } from "../../shared/print-icons";
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
  id: z.literal("room_tile:ruins:13"),
  rawId: z.literal("dungeon_tile:p007"),
  roomId: z.literal("room:ruins:13"),
  location: z.literal("ruins"),
  number: z.literal(13),
  name: z.literal("Fanatic Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(7),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-169"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:ruins:13"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(13),
    ruling: z.literal("R-169"),
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

// R-169仅批准图面，Boss运行时准入仍单独核实。
export const approvedFanaticRoom = tileShape.parse({
  id: "room_tile:ruins:13",
  rawId: "dungeon_tile:p007",
  roomId: "room:ruins:13",
  location: "ruins",
  number: 13,
  name: "Fanatic Room",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 7, face: "front" },
  ruling: "R-169",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:ruins:13", file: ROOM_FRONT, page: 13, ruling: "R-169" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "H", defensive: "A", ranged: "H", support: "C" },
    monsters: { aggressive: "B", defensive: "B", ranged: "E", support: "E" },
    lootAreas: [],
    markers: [
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "A",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "C",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "B",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "B",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["E", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["E", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [3, 3, 3, 4, 3, 4, 3, 3, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: i === 1 ? "high" : "normal",
  })),
  edges: [
    ..."A-B A-D B-C B-E C-F D-E D-G E-F E-H F-I G-H H-I"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-D B-F D-H E-G E-I F-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedFanaticRoom);
export const fanaticRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-169获批几何、部署或来源漂移" });
});
