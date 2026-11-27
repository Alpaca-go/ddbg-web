import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
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
  id: z.literal("room_tile:darkest:09"),
  rawId: z.literal("dungeon_tile:p013"),
  roomId: z.literal("room:darkest:09"),
  location: z.literal("darkestDungeon"),
  number: z.literal(9),
  name: z.literal("Templars Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(13),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-162"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:09"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(22),
    ruling: z.literal("R-162"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.enum(["B", "E", "H", "K", "N"]),
      iconId: z.literal(
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p013:front:14"),
      ),
      effect: z.literal("spikes"),
      status: z.literal("confirmed"),
      printedText: z.string(),
      printedRange: z.string(),
      runtimeReady: z.literal(true),
    }),
  ),
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

// R-162：几何及卡文来源获批；尖刺运行时见 R-193。
export const approvedTemplarsRoom = tileShape.parse({
  id: "room_tile:darkest:09",
  rawId: "dungeon_tile:p013",
  roomId: "room:darkest:09",
  location: "darkestDungeon",
  number: 9,
  name: "Templars Room",
  source: {
    file: "DD_COREBOX_TILES_FRONT.pdf",
    page: 13,
    face: "front",
  },
  ruling: "R-162",
  geometryVerified: true,
  usable: false,
  effectSource: {
    roomId: "room:darkest:09",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 22,
    ruling: "R-162",
  },
  specialRegions: [
    {
      areaId: "B",
      iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p013:front:14"),
      effect: "spikes",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@223} Spikes: Heroes {print:shuffle@548} or ending their move here take {print:damage@434} 5 and Bleed 3 {print:bleed@48} 3t.",
      ),
      printedRange: "1-2",
      runtimeReady: true,
    },
    {
      areaId: "E",
      iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p013:front:14"),
      effect: "spikes",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@223} Spikes: Heroes {print:shuffle@548} or ending their move here take {print:damage@434} 5 and Bleed 3 {print:bleed@48} 3t.",
      ),
      printedRange: "3-4",
      runtimeReady: true,
    },
    {
      areaId: "H",
      iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p013:front:14"),
      effect: "spikes",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@223} Spikes: Heroes {print:shuffle@548} or ending their move here take {print:damage@434} 5 and Bleed 3 {print:bleed@48} 3t.",
      ),
      printedRange: "5-6",
      runtimeReady: true,
    },
    {
      areaId: "K",
      iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p013:front:14"),
      effect: "spikes",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@223} Spikes: Heroes {print:shuffle@548} or ending their move here take {print:damage@434} 5 and Bleed 3 {print:bleed@48} 3t.",
      ),
      printedRange: "7-8",
      runtimeReady: true,
    },
    {
      areaId: "N",
      iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p013:front:14"),
      effect: "spikes",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@223} Spikes: Heroes {print:shuffle@548} or ending their move here take {print:damage@434} 5 and Bleed 3 {print:bleed@48} 3t.",
      ),
      printedRange: "9-10",
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "I",
      defensive: "F",
      ranged: "G",
      support: "F",
    },
    monsters: {
      aggressive: "M",
      defensive: "M",
      ranged: "C",
      support: "C",
    },
    lootAreas: [],
    markers: [
      {
        areaId: "I",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        semantic: "hero_aggressive_start",
        status: "confirmed",
      },
      {
        areaId: "F",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        semantic: "hero_defensive_start",
        status: "confirmed",
      },
      {
        areaId: "G",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        semantic: "hero_ranged_start",
        status: "confirmed",
      },
      {
        areaId: "F",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        semantic: "hero_support_start",
        status: "confirmed",
      },
      {
        areaId: "M",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        semantic: "monster_aggressive_start",
        status: "confirmed",
      },
      {
        areaId: "M",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        semantic: "monster_defensive_start",
        status: "confirmed",
      },
      {
        areaId: "C",
        iconId: printIcon("stance_ranged_monster_slot", 808),
        semantic: "monster_ranged_start",
        status: "confirmed",
      },
      {
        areaId: "C",
        iconId: printIcon("stance_support_monster_slot", 216),
        semantic: "monster_support_start",
        status: "confirmed",
      },
    ],
  },
  areas: [
    {
      id: "A",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "B",
      capacity: 1,
      elevation: "normal",
    },
    {
      id: "C",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "D",
      capacity: 4,
      elevation: "normal",
    },
    {
      id: "E",
      capacity: 1,
      elevation: "normal",
    },
    {
      id: "F",
      capacity: 4,
      elevation: "normal",
    },
    {
      id: "G",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "H",
      capacity: 1,
      elevation: "normal",
    },
    {
      id: "I",
      capacity: 3,
      elevation: "normal",
    },
    {
      id: "J",
      capacity: 4,
      elevation: "normal",
    },
    {
      id: "K",
      capacity: 1,
      elevation: "normal",
    },
    {
      id: "L",
      capacity: 4,
      elevation: "normal",
    },
    {
      id: "M",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "N",
      capacity: 1,
      elevation: "normal",
    },
  ],
  edges: [
    {
      from: "A",
      to: "B",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "A",
      to: "C",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "A",
      to: "F",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "B",
      to: "C",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "B",
      to: "F",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "C",
      to: "D",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "C",
      to: "F",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "D",
      to: "E",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "D",
      to: "G",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "D",
      to: "I",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "E",
      to: "I",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "F",
      to: "G",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "F",
      to: "H",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "F",
      to: "J",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "G",
      to: "H",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "G",
      to: "I",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "H",
      to: "L",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "I",
      to: "L",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "J",
      to: "K",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "L",
      to: "M",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "L",
      to: "N",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "M",
      to: "N",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "C",
      to: "G",
      cornerOnly: true,
      blocked: false,
    },
    {
      from: "D",
      to: "F",
      cornerOnly: true,
      blocked: false,
    },
    {
      from: "E",
      to: "G",
      cornerOnly: true,
      blocked: false,
    },
    {
      from: "F",
      to: "L",
      cornerOnly: true,
      blocked: false,
    },
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedTemplarsRoom);
export const templarsRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-162获批几何、部署或效果来源漂移" });
});
