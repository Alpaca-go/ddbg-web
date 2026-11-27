import { printSourceIcon } from "../../shared/print-icons";
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
  id: z.literal("room_tile:ruins:10"),
  rawId: z.literal("dungeon_tile:p006"),
  roomId: z.literal("room:ruins:10"),
  location: z.literal("ruins"),
  number: z.literal(10),
  name: z.literal("Necromancer Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(6),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-166"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:ruins:10"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(10),
    ruling: z.literal("R-166"),
  }),
  specialRegions: z.array(z.never()),
  deployment: z.strictObject({
    printReview: z.literal("verified"),
    heroes: placements,
    monsters: z.strictObject({ aggressive: z.literal("A") }),
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

// R-166仅批准图面，Boss运行时准入仍单独核实。
export const approvedNecromancerRoom = tileShape.parse({
  id: "room_tile:ruins:10",
  rawId: "dungeon_tile:p006",
  roomId: "room:ruins:10",
  location: "ruins",
  number: 10,
  name: "Necromancer Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 6, face: "back" },
  ruling: "R-166",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:ruins:10", file: ROOM_FRONT, page: 10, ruling: "R-166" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "G", defensive: "G", ranged: "G", support: "G" },
    monsters: { aggressive: "A" },
    lootAreas: [],
    markers: [
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "A",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [3, 4, 3, 4, 3, 2, 4, 2].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: i === 0 ? "high" : "normal",
  })),
  edges: [
    ..."A-C B-C B-E B-F C-D C-E D-E D-H E-G F-G G-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."A-B A-D B-G D-G E-F E-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedNecromancerRoom);
export const necromancerRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-166获批几何、部署或来源漂移" });
});
