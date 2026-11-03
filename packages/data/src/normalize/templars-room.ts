import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";

export function assertTemplarsRoomTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p013")?.faces.front;
  if (
    !face ||
    face.icons.filter((i) => i.iconId === "6e67687564").length !== 5 ||
    ["1-2", "3-4", "5-6", "7-8", "9-10"].some((label) => !face.spans.some((s) => s.t === label))
  )
    throw new Error("R-162：五个尖刺星标或印刷编号漂移");
}

export const templarsRoomEffectLines = [
  "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their",
  "move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
] as const;

export function assertTemplarsRoomEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p022");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 22 ||
    JSON.stringify(card.faces.front.lines.slice(-2).map((l) => l.text)) !==
      JSON.stringify(templarsRoomEffectLines) ||
    ["62d166a84f", "8c4c3c2ec2", "0453c84dbc", "784ec4fe7a"].some(
      (id) => !card.faces.front.icons.some((i) => i.iconId === id),
    )
  )
    throw new Error("Templars Room Room p22来源或效果行漂移（R-162）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p013:front"),
  rawId: z.literal("dungeon_tile:p013"),
  roomId: z.literal("room:p022"),
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
    roomId: z.literal("room:p022"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(22),
    ruling: z.literal("R-162"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.enum(["B", "E", "H", "K", "N"]),
      iconId: z.literal("6e67687564"),
      effect: z.literal("spikes"),
      status: z.literal("confirmed"),
      printedText: z.string(),
      printedRange: z.string(),
      runtimeReady: z.literal(false),
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

// R-162：几何及卡文来源获批；尖刺与Boss运行时准入另行核实。
export const approvedTemplarsRoom = tileShape.parse({
  id: "room_tile:p013:front",
  rawId: "dungeon_tile:p013",
  roomId: "room:p022",
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
    roomId: "room:p022",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 22,
    ruling: "R-162",
  },
  specialRegions: [
    {
      areaId: "B",
      iconId: "6e67687564",
      effect: "spikes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
      printedRange: "1-2",
      runtimeReady: false,
    },
    {
      areaId: "E",
      iconId: "6e67687564",
      effect: "spikes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
      printedRange: "3-4",
      runtimeReady: false,
    },
    {
      areaId: "H",
      iconId: "6e67687564",
      effect: "spikes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
      printedRange: "5-6",
      runtimeReady: false,
    },
    {
      areaId: "K",
      iconId: "6e67687564",
      effect: "spikes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
      printedRange: "7-8",
      runtimeReady: false,
    },
    {
      areaId: "N",
      iconId: "6e67687564",
      effect: "spikes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
      printedRange: "9-10",
      runtimeReady: false,
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
        iconId: "7b8c742c86",
        semantic: "hero_aggressive_start",
        status: "confirmed",
      },
      {
        areaId: "F",
        iconId: "1a71d94723",
        semantic: "hero_defensive_start",
        status: "confirmed",
      },
      {
        areaId: "G",
        iconId: "7ab26866fc",
        semantic: "hero_ranged_start",
        status: "confirmed",
      },
      {
        areaId: "F",
        iconId: "39d6ddf024",
        semantic: "hero_support_start",
        status: "confirmed",
      },
      {
        areaId: "M",
        iconId: "8787ebb1b2",
        semantic: "monster_aggressive_start",
        status: "confirmed",
      },
      {
        areaId: "M",
        iconId: "1f26dc63eb",
        semantic: "monster_defensive_start",
        status: "confirmed",
      },
      {
        areaId: "C",
        iconId: "643d396fef",
        semantic: "monster_ranged_start",
        status: "confirmed",
      },
      {
        areaId: "C",
        iconId: "293f170eab",
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
