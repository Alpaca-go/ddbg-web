import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";

export const teleportersEffectLines = [
  "Characters can move and attack",
  printLine("between {extract:corebox/raw/room.json:room:p019:front:27} Areas. Heroes moving"),
  printLine(
    "through a {extract:corebox/raw/room.json:room:p019:front:28} Area suffer {print:stress@305} +1.",
  ),
] as const;

export function assertTeleportersEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p019");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 19 ||
    JSON.stringify(card.faces.front.lines.slice(-3).map((l) => l.text)) !==
      JSON.stringify(teleportersEffectLines) ||
    !card.faces.front.icons.some(
      (i) => i.iconId === printSourceIcon("corebox/raw/room.json:room:p019:front:27"),
    ) ||
    !card.faces.front.icons.some(
      (i) => i.iconId === printSourceIcon("corebox/raw/room.json:room:p019:front:28"),
    ) ||
    !card.faces.front.icons.some((i) => i.iconId === printIcon("stress", 305))
  )
    throw new Error("Teleporters Room p19来源或效果行漂移（R-159）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:darkest:06"),
  rawId: z.literal("dungeon_tile:p011"),
  roomId: z.literal("room:darkest:06"),
  location: z.literal("darkestDungeon"),
  number: z.literal(6),
  name: z.literal("Teleporters"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(11),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-159"),
  geometryVerified: z.literal(true),
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:06"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(19),
    ruling: z.literal("R-159"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.enum(["A", "C", "F", "H"]),
      iconId: z.literal(printSourceIcon("corebox/raw/room.json:room:p002:front:22")),
      effect: z.literal("teleporters"),
      status: z.literal("confirmed"),
      printedText: z.string(),
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

// R-159：逐面几何已批准；橙星虚拟邻接与英雄穿过压力已接通。
export const approvedTeleporters = tileShape.parse({
  id: "room_tile:darkest:06",
  rawId: "dungeon_tile:p011",
  roomId: "room:darkest:06",
  location: "darkestDungeon",
  number: 6,
  name: "Teleporters",
  source: {
    file: "DD_COREBOX_TILES_BACK.pdf",
    page: 11,
    face: "back",
  },
  ruling: "R-159",
  geometryVerified: true,
  usable: true,
  effectSource: {
    roomId: "room:darkest:06",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 19,
    ruling: "R-159",
  },
  specialRegions: [
    {
      areaId: "A",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "teleporters",
      status: "confirmed",
      printedText: printLine(
        "Characters can move and attack between {extract:corebox/raw/room.json:room:p019:front:27} Areas. Heroes moving through a {extract:corebox/raw/room.json:room:p019:front:28} Area suffer {print:stress@305} +1.",
      ),
      runtimeReady: true,
    },
    {
      areaId: "C",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "teleporters",
      status: "confirmed",
      printedText: printLine(
        "Characters can move and attack between {extract:corebox/raw/room.json:room:p019:front:27} Areas. Heroes moving through a {extract:corebox/raw/room.json:room:p019:front:28} Area suffer {print:stress@305} +1.",
      ),
      runtimeReady: true,
    },
    {
      areaId: "F",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "teleporters",
      status: "confirmed",
      printedText: printLine(
        "Characters can move and attack between {extract:corebox/raw/room.json:room:p019:front:27} Areas. Heroes moving through a {extract:corebox/raw/room.json:room:p019:front:28} Area suffer {print:stress@305} +1.",
      ),
      runtimeReady: true,
    },
    {
      areaId: "H",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "teleporters",
      status: "confirmed",
      printedText: printLine(
        "Characters can move and attack between {extract:corebox/raw/room.json:room:p019:front:27} Areas. Heroes moving through a {extract:corebox/raw/room.json:room:p019:front:28} Area suffer {print:stress@305} +1.",
      ),
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "G",
      defensive: "D",
      ranged: "B",
      support: "E",
    },
    monsters: {
      aggressive: "A",
      defensive: "F",
      ranged: "H",
      support: "C",
    },
    lootAreas: ["C", "F"],
    markers: [
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "D",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "B",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "E",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "A",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "F",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["H", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["C", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [
    ["A", 3, "normal"],
    ["B", 2, "normal"],
    ["C", 3, "normal"],
    ["D", 2, "normal"],
    ["E", 2, "normal"],
    ["F", 3, "normal"],
    ["G", 2, "normal"],
    ["H", 3, "normal"],
  ].map(([id, capacity, elevation]) => ({ id, capacity, elevation })),
  edges: [
    ["A", "D", false],
    ["B", "C", false],
    ["E", "H", false],
    ["F", "G", false],
  ].map(([from, to, cornerOnly]) => ({ from, to, cornerOnly, blocked: false })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedTeleporters);
export const teleportersSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-159获批几何、部署或效果来源漂移" });
});
