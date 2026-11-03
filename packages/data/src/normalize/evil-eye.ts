import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";

export const evilEyeEffectLines = [
  "{icon:62d166a84f} A Evil Gaze: Heroes ending their turn here",
  "take a Negative Quirk. A Hero can spend",
  "2 actions here to destroy the Eye to gain a",
  "Positive Quirk and all Heroes also gain {icon:9d58d3d431} -5.",
  "{icon:62d166a84f} B Staring Eyes: Heroes ending",
  "their turn here suffer {icon:9d58d3d431} +2.",
] as const;

export function assertEvilEyeEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p020");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 20 ||
    JSON.stringify(card.faces.front.lines.slice(-6).map((l) => l.text)) !==
      JSON.stringify(evilEyeEffectLines) ||
    card.faces.front.icons.filter((i) => i.iconId === "62d166a84f").length !== 2 ||
    card.faces.front.icons.filter((i) => i.iconId === "9d58d3d431").length !== 2
  )
    throw new Error("EvilEye Room p20来源或效果行漂移（R-160）");
}

export function assertEvilEyeTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p012")?.faces.front;
  const labels = face?.lines
    .filter((l) => l.text.includes("{icon:4591aebebd}"))
    .map((l) => l.text.at(-1));
  if (
    JSON.stringify(labels) !== JSON.stringify(["B", "B", "A", "B", "B"]) ||
    face?.icons.filter((i) => i.iconId === "4591aebebd").length !== 5
  )
    throw new Error("R-160：Evil Eye印刷A/B星标来源漂移");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p012"),
  rawId: z.literal("dungeon_tile:p012"),
  roomId: z.literal("room:p020"),
  location: z.literal("darkestDungeon"),
  number: z.literal(7),
  name: z.literal("Evil Eye"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(12),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-160"),
  geometryVerified: z.literal(true),
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:p020"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(20),
    ruling: z.literal("R-160"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.enum(["A", "D", "E", "H", "I"]),
      iconId: z.literal("4591aebebd"),
      printedLabel: z.enum(["A", "B"]),
      effect: z.enum(["evilGaze", "staringEyes"]),
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

// R-160：区域字母与印刷A/B星标分开记录；特殊效果按R-170接通。
export const approvedEvilEye = tileShape.parse({
  id: "room_tile:p012",
  rawId: "dungeon_tile:p012",
  roomId: "room:p020",
  location: "darkestDungeon",
  number: 7,
  name: "Evil Eye",
  source: {
    file: "DD_COREBOX_TILES_FRONT.pdf",
    page: 12,
    face: "front",
  },
  ruling: "R-160",
  geometryVerified: true,
  usable: true,
  effectSource: {
    roomId: "room:p020",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 20,
    ruling: "R-160",
  },
  specialRegions: [
    {
      areaId: "E",
      iconId: "4591aebebd",
      printedLabel: "A",
      effect: "evilGaze",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} A Evil Gaze: Heroes ending their turn here take a Negative Quirk. A Hero can spend 2 actions here to destroy the Eye to gain a Positive Quirk and all Heroes also gain {icon:9d58d3d431} -5.",
      runtimeReady: true,
    },
    {
      areaId: "A",
      iconId: "4591aebebd",
      printedLabel: "B",
      effect: "staringEyes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} B Staring Eyes: Heroes ending their turn here suffer {icon:9d58d3d431} +2.",
      runtimeReady: true,
    },
    {
      areaId: "D",
      iconId: "4591aebebd",
      printedLabel: "B",
      effect: "staringEyes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} B Staring Eyes: Heroes ending their turn here suffer {icon:9d58d3d431} +2.",
      runtimeReady: true,
    },
    {
      areaId: "H",
      iconId: "4591aebebd",
      printedLabel: "B",
      effect: "staringEyes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} B Staring Eyes: Heroes ending their turn here suffer {icon:9d58d3d431} +2.",
      runtimeReady: true,
    },
    {
      areaId: "I",
      iconId: "4591aebebd",
      printedLabel: "B",
      effect: "staringEyes",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} B Staring Eyes: Heroes ending their turn here suffer {icon:9d58d3d431} +2.",
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "G",
      defensive: "G",
      ranged: "G",
      support: "G",
    },
    monsters: {
      aggressive: "C",
      defensive: "C",
      ranged: "C",
      support: "C",
    },
    lootAreas: ["A", "I"],
    markers: [
      ["G", "7b8c742c86", "hero_aggressive_start"],
      ["G", "1a71d94723", "hero_defensive_start"],
      ["G", "7ab26866fc", "hero_ranged_start"],
      ["G", "39d6ddf024", "hero_support_start"],
      ["C", "8787ebb1b2", "monster_aggressive_start"],
      ["C", "1f26dc63eb", "monster_defensive_start"],
      ["C", "643d396fef", "monster_ranged_start"],
      ["C", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [
    ["A", 2, "normal"],
    ["B", 3, "normal"],
    ["C", 4, "normal"],
    ["D", 2, "normal"],
    ["E", 3, "normal"],
    ["F", 3, "normal"],
    ["G", 4, "normal"],
    ["H", 4, "normal"],
    ["I", 2, "normal"],
  ].map(([id, capacity, elevation]) => ({ id, capacity, elevation })),
  edges: [
    ["A", "B", false],
    ["A", "D", false],
    ["B", "C", false],
    ["B", "E", false],
    ["C", "F", false],
    ["D", "E", false],
    ["D", "G", false],
    ["E", "F", false],
    ["E", "H", false],
    ["F", "I", false],
    ["G", "H", false],
    ["H", "I", false],
    ["A", "E", true],
    ["B", "D", true],
    ["B", "F", true],
    ["C", "E", true],
    ["D", "H", true],
    ["E", "G", true],
    ["E", "I", true],
    ["F", "H", true],
  ].map(([from, to, cornerOnly]) => ({ from, to, cornerOnly, blocked: false })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedEvilEye);
export const evilEyeSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-160获批几何、部署或效果来源漂移" });
});
