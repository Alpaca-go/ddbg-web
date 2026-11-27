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
    iconId: z.literal(printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:20")),
    overlayIconId: z.literal(
      printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:19"),
    ),
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
    iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:20"),
    overlayIconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:19"),
    printedOverlay: "!",
    runtimeReady: true,
  },
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "H", defensive: "B", ranged: "B", support: "H" },
    monsters: { aggressive: "C", defensive: "G", ranged: "E", support: "A" },
    lootAreas: ["F", "F", "F"],
    markers: [
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "B",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "B",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "C",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["E", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["A", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
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
