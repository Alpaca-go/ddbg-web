import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";

export const eldritchPowerChamberEffectLines = [
  "When Monsters need to move into range",
  "distance, they always move towards",
  printLine("Area {print:area_marker@337} . If a Monster ends its turn in"),
  printLine("{print:area_marker@337} Area, Heroes take {print:damage@1} 5 each."),
] as const;

export function assertEldritchPowerChamberEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p018");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 18 ||
    JSON.stringify(card.faces.front.lines.slice(-4).map((l) => l.text)) !==
      JSON.stringify(eldritchPowerChamberEffectLines) ||
    !card.faces.front.icons.some((i) => i.iconId === printIcon("area_marker", 337))
  )
    throw new Error("Eldritch Power Chamber Room p18来源或效果行漂移（R-158）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:darkest:05"),
  rawId: z.literal("dungeon_tile:p011"),
  roomId: z.literal("room:darkest:05"),
  location: z.literal("darkestDungeon"),
  number: z.literal(5),
  name: z.literal("Eldritch Power Chamber"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(11),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-158"),
  geometryVerified: z.literal(true),
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:05"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(18),
    ruling: z.literal("R-158"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.literal("C"),
      iconId: z.literal(printSourceIcon("corebox/raw/room.json:room:p002:front:22")),
      effect: z.literal("eldritchPower"),
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

// R-158：逐面几何已批准；橙星移动偏好与回合结束伤害已接通。
export const approvedEldritchPowerChamber = tileShape.parse({
  id: "room_tile:darkest:05",
  rawId: "dungeon_tile:p011",
  roomId: "room:darkest:05",
  location: "darkestDungeon",
  number: 5,
  name: "Eldritch Power Chamber",
  source: {
    file: "DD_COREBOX_TILES_FRONT.pdf",
    page: 11,
    face: "front",
  },
  ruling: "R-158",
  geometryVerified: true,
  usable: true,
  effectSource: {
    roomId: "room:darkest:05",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 18,
    ruling: "R-158",
  },
  specialRegions: [
    {
      areaId: "C",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "eldritchPower",
      status: "confirmed",
      printedText: printLine(
        "When Monsters need to move into range distance, they always move towards Area {print:area_marker@337} . If a Monster ends its turn in {print:area_marker@337} Area, Heroes take {print:damage@1} 5 each.",
      ),
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "G",
      defensive: "G",
      ranged: "C",
      support: "C",
    },
    monsters: {
      aggressive: "E",
      defensive: "E",
      ranged: "A",
      support: "F",
    },
    lootAreas: ["A", "A"],
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
        "C",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "C",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "E",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "E",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["A", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["F", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [
    ["A", 2, "normal"],
    ["B", 3, "normal"],
    ["C", 4, "normal"],
    ["D", 3, "normal"],
    ["E", 3, "normal"],
    ["F", 4, "normal"],
    ["G", 4, "normal"],
    ["H", 3, "normal"],
  ].map(([id, capacity, elevation]) => ({ id, capacity, elevation })),
  edges: [
    ["A", "B", false],
    ["A", "D", false],
    ["B", "C", false],
    ["B", "E", false],
    ["C", "E", false],
    ["C", "F", false],
    ["D", "E", false],
    ["D", "G", false],
    ["E", "F", false],
    ["F", "H", false],
    ["G", "H", false],
    ["A", "E", true],
    ["B", "D", true],
  ].map(([from, to, cornerOnly]) => ({ from, to, cornerOnly, blocked: false })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedEldritchPowerChamber);
export const eldritchPowerChamberSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-158获批几何、部署或效果来源漂移" });
});
