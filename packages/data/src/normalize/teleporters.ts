import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";

export const teleportersEffectLines = [
  "Characters can move and attack",
  "between {icon:f9fbe7ebd2} Areas. Heroes moving",
  "through a {icon:340d4a530a} Area suffer {icon:df38279161} +1.",
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
    !card.faces.front.icons.some((i) => i.iconId === "f9fbe7ebd2") ||
    !card.faces.front.icons.some((i) => i.iconId === "340d4a530a") ||
    !card.faces.front.icons.some((i) => i.iconId === "df38279161")
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
  id: z.literal("room_tile:p011:back"),
  rawId: z.literal("dungeon_tile:p011"),
  roomId: z.literal("room:p019"),
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
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p019"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(19),
    ruling: z.literal("R-159"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.enum(["A", "C", "F", "H"]),
      iconId: z.literal("4591aebebd"),
      effect: z.literal("teleporters"),
      status: z.literal("confirmed"),
      printedText: z.string(),
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

// R-159：已批准实体几何与橙星卡文来源；传送运行时未接通。
export const approvedTeleporters = tileShape.parse({
  id: "room_tile:p011:back",
  rawId: "dungeon_tile:p011",
  roomId: "room:p019",
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
  usable: false,
  effectSource: {
    roomId: "room:p019",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 19,
    ruling: "R-159",
  },
  specialRegions: [
    {
      areaId: "A",
      iconId: "4591aebebd",
      effect: "teleporters",
      status: "confirmed",
      printedText:
        "Characters can move and attack between {icon:f9fbe7ebd2} Areas. Heroes moving through a {icon:340d4a530a} Area suffer {icon:df38279161} +1.",
      runtimeReady: false,
    },
    {
      areaId: "C",
      iconId: "4591aebebd",
      effect: "teleporters",
      status: "confirmed",
      printedText:
        "Characters can move and attack between {icon:f9fbe7ebd2} Areas. Heroes moving through a {icon:340d4a530a} Area suffer {icon:df38279161} +1.",
      runtimeReady: false,
    },
    {
      areaId: "F",
      iconId: "4591aebebd",
      effect: "teleporters",
      status: "confirmed",
      printedText:
        "Characters can move and attack between {icon:f9fbe7ebd2} Areas. Heroes moving through a {icon:340d4a530a} Area suffer {icon:df38279161} +1.",
      runtimeReady: false,
    },
    {
      areaId: "H",
      iconId: "4591aebebd",
      effect: "teleporters",
      status: "confirmed",
      printedText:
        "Characters can move and attack between {icon:f9fbe7ebd2} Areas. Heroes moving through a {icon:340d4a530a} Area suffer {icon:df38279161} +1.",
      runtimeReady: false,
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
      ["G", "7b8c742c86", "hero_aggressive_start"],
      ["D", "1a71d94723", "hero_defensive_start"],
      ["B", "7ab26866fc", "hero_ranged_start"],
      ["E", "39d6ddf024", "hero_support_start"],
      ["A", "8787ebb1b2", "monster_aggressive_start"],
      ["F", "1f26dc63eb", "monster_defensive_start"],
      ["H", "643d396fef", "monster_ranged_start"],
      ["C", "293f170eab", "monster_support_start"],
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
