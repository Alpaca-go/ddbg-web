import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";

export const hallOfAscensionEffectLines = [
  "{icon:0fd119772a} : Heroes can spend 2 actions here",
  "and suffer {icon:9b00e692ba} +3 to instantly upgrade",
  "themselves or one of their Skills.",
] as const;

export function assertHallOfAscensionEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p015");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 15 ||
    JSON.stringify(card.faces.front.lines.slice(-3).map((l) => l.text)) !==
      JSON.stringify(hallOfAscensionEffectLines) ||
    !card.faces.front.icons.some((i) => i.iconId === "9b00e692ba") ||
    !card.faces.front.icons.some((i) => i.iconId === "0fd119772a")
  )
    throw new Error("Hall of Ascension Room p15来源或效果行漂移（R-153）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p009:back"),
  rawId: z.literal("dungeon_tile:p009"),
  roomId: z.literal("room:p015"),
  location: z.literal("darkestDungeon"),
  number: z.literal(2),
  name: z.literal("Hall of Ascension"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(9),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-153"),
  geometryVerified: z.literal(true),
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:p015"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(15),
    ruling: z.literal("R-153"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.literal("B"),
      iconId: z.literal("0d13b745be"),
      effect: z.literal("hallOfAscensionUpgrade"),
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

// R-153–155：几何、费用、重复使用与新增空槽已接通。
export const approvedHallOfAscension = tileShape.parse({
  id: "room_tile:p009:back",
  rawId: "dungeon_tile:p009",
  roomId: "room:p015",
  location: "darkestDungeon",
  number: 2,
  name: "Hall of Ascension",
  source: {
    file: "DD_COREBOX_TILES_BACK.pdf",
    page: 9,
    face: "back",
  },
  ruling: "R-153",
  geometryVerified: true,
  usable: true,
  effectSource: {
    roomId: "room:p015",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 15,
    ruling: "R-153",
  },
  specialRegions: [
    {
      areaId: "B",
      iconId: "0d13b745be",
      effect: "hallOfAscensionUpgrade",
      status: "confirmed",
      printedText:
        "{icon:0fd119772a} : Heroes can spend 2 actions here and suffer {icon:9b00e692ba} +3 to instantly upgrade themselves or one of their Skills.",
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "L",
      defensive: "J",
      ranged: "L",
      support: "J",
    },
    monsters: {
      aggressive: "H",
      defensive: "G",
      ranged: "E",
      support: "K",
    },
    lootAreas: ["A", "C", "C"],
    markers: [
      {
        areaId: "L",
        iconId: "7b8c742c86",
        semantic: "hero_aggressive_start",
        status: "confirmed",
      },
      {
        areaId: "J",
        iconId: "1a71d94723",
        semantic: "hero_defensive_start",
        status: "confirmed",
      },
      {
        areaId: "L",
        iconId: "7ab26866fc",
        semantic: "hero_ranged_start",
        status: "confirmed",
      },
      {
        areaId: "J",
        iconId: "39d6ddf024",
        semantic: "hero_support_start",
        status: "confirmed",
      },
      {
        areaId: "H",
        iconId: "8787ebb1b2",
        semantic: "monster_aggressive_start",
        status: "confirmed",
      },
      {
        areaId: "G",
        iconId: "1f26dc63eb",
        semantic: "monster_defensive_start",
        status: "confirmed",
      },
      {
        areaId: "E",
        iconId: "643d396fef",
        semantic: "monster_ranged_start",
        status: "confirmed",
      },
      {
        areaId: "K",
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
      capacity: 2,
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
      capacity: 2,
      elevation: "high",
    },
    {
      id: "F",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "G",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "H",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "I",
      capacity: 2,
      elevation: "normal",
    },
    {
      id: "J",
      capacity: 3,
      elevation: "normal",
    },
    {
      id: "K",
      capacity: 2,
      elevation: "high",
    },
    {
      id: "L",
      capacity: 3,
      elevation: "normal",
    },
  ],
  edges: [
    {
      from: "A",
      to: "D",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "B",
      to: "E",
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
      to: "G",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "D",
      to: "J",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "E",
      to: "G",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "E",
      to: "H",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "F",
      to: "I",
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
      to: "K",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "H",
      to: "I",
      cornerOnly: false,
      blocked: false,
    },
    {
      from: "H",
      to: "K",
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
      from: "F",
      to: "H",
      cornerOnly: true,
      blocked: false,
    },
    {
      from: "G",
      to: "J",
      cornerOnly: true,
      blocked: false,
    },
    {
      from: "H",
      to: "L",
      cornerOnly: true,
      blocked: false,
    },
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedHallOfAscension);
export const hallOfAscensionSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-153获批几何、部署或效果来源漂移" });
});
