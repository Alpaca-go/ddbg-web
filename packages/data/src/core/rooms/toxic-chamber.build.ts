import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";

export const toxicChamberEffectLines = [
  printLine("{print:area_marker@337} Toxic Vapors: Heroes"),
  "standing here suffer -3 Acc.",
] as const;

export function assertToxicChamberEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p017");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 17 ||
    JSON.stringify(card.faces.front.lines.slice(-2).map((l) => l.text)) !==
      JSON.stringify(toxicChamberEffectLines) ||
    !card.faces.front.icons.some((i) => i.iconId === printIcon("area_marker", 337))
  )
    throw new Error("Toxic Chamber Room p17来源或效果行漂移（R-157）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:darkest:04"),
  rawId: z.literal("dungeon_tile:p010"),
  roomId: z.literal("room:darkest:04"),
  location: z.literal("darkestDungeon"),
  number: z.literal(4),
  name: z.literal("Toxic Chamber"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(10),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-157"),
  geometryVerified: z.literal(true),
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:04"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(17),
    ruling: z.literal("R-157"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.enum(["A", "B", "C", "E"]),
      iconId: z.literal(printSourceIcon("corebox/raw/room.json:room:p002:front:22")),
      effect: z.literal("toxicVapors"),
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

// R-157：含 Kyries 修正的 D/F 部署；Toxic Vapors 站立 Acc −3 已接通。
export const approvedToxicChamber = tileShape.parse({
  id: "room_tile:darkest:04",
  rawId: "dungeon_tile:p010",
  roomId: "room:darkest:04",
  location: "darkestDungeon",
  number: 4,
  name: "Toxic Chamber",
  source: {
    file: "DD_COREBOX_TILES_BACK.pdf",
    page: 10,
    face: "back",
  },
  ruling: "R-157",
  geometryVerified: true,
  usable: true,
  effectSource: {
    roomId: "room:darkest:04",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 17,
    ruling: "R-157",
  },
  specialRegions: [
    {
      areaId: "A",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "toxicVapors",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@337} Toxic Vapors: Heroes standing here suffer -3 Acc.",
      ),
      runtimeReady: true,
    },
    {
      areaId: "B",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "toxicVapors",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@337} Toxic Vapors: Heroes standing here suffer -3 Acc.",
      ),
      runtimeReady: true,
    },
    {
      areaId: "C",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "toxicVapors",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@337} Toxic Vapors: Heroes standing here suffer -3 Acc.",
      ),
      runtimeReady: true,
    },
    {
      areaId: "E",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "toxicVapors",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@337} Toxic Vapors: Heroes standing here suffer -3 Acc.",
      ),
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "J",
      defensive: "H",
      ranged: "J",
      support: "H",
    },
    monsters: {
      aggressive: "D",
      defensive: "G",
      ranged: "F",
      support: "F",
    },
    lootAreas: ["B", "B", "E", "E"],
    markers: [
      [
        "J",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "J",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "D",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["F", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["F", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [
    ["A", 2, "normal"],
    ["B", 4, "normal"],
    ["C", 2, "normal"],
    ["D", 4, "normal"],
    ["E", 2, "normal"],
    ["F", 2, "high"],
    ["G", 4, "normal"],
    ["H", 2, "normal"],
    ["I", 3, "normal"],
    ["J", 2, "normal"],
  ].map(([id, capacity, elevation]) => ({ id, capacity, elevation })),
  edges: [
    ["A", "B", false],
    ["A", "D", false],
    ["B", "C", false],
    ["C", "G", false],
    ["D", "H", false],
    ["E", "F", false],
    ["F", "I", false],
    ["G", "J", false],
    ["H", "I", false],
    ["I", "J", false],
    ["B", "D", true],
    ["B", "G", true],
    ["D", "I", true],
    ["G", "I", true],
  ].map(([from, to, cornerOnly]) => ({ from, to, cornerOnly, blocked: false })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedToxicChamber);
export const toxicChamberSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-157获批几何、部署或效果来源漂移" });
});
