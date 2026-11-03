import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";

export const templeOfTheChosenEffectLines = [
  "{icon:62d166a84f} Rite of the Chosen: When",
  "a Monster ends its turn here, all",
  "Monsters {icon:731f6665d0} 5 and Heroes {icon:df38279161} +1 plus an",
  "additional {icon:9b00e692ba} +1 / Negative Quirk.",
] as const;

export function assertTempleOfTheChosenEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p021");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 21 ||
    JSON.stringify(card.faces.front.lines.slice(-4).map((l) => l.text)) !==
      JSON.stringify(templeOfTheChosenEffectLines) ||
    ["62d166a84f", "731f6665d0", "df38279161", "9b00e692ba"].some(
      (id) => !card.faces.front.icons.some((i) => i.iconId === id),
    )
  )
    throw new Error("Temple of the Chosen Room p21来源或效果行漂移（R-161）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p012:back"),
  rawId: z.literal("dungeon_tile:p012"),
  roomId: z.literal("room:p021"),
  location: z.literal("darkestDungeon"),
  number: z.literal(8),
  name: z.literal("Temple of the Chosen"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(12),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-161"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p021"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(21),
    ruling: z.literal("R-161"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.literal("A"),
      iconId: z.literal("4591aebebd"),
      effect: z.literal("riteOfTheChosen"),
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

// R-161：本面几何与卡文来源已批准；Rite of the Chosen运行时未接通。
export const approvedTempleOfTheChosen = tileShape.parse({
  id: "room_tile:p012:back",
  rawId: "dungeon_tile:p012",
  roomId: "room:p021",
  location: "darkestDungeon",
  number: 8,
  name: "Temple of the Chosen",
  source: {
    file: "DD_COREBOX_TILES_BACK.pdf",
    page: 12,
    face: "back",
  },
  ruling: "R-161",
  geometryVerified: true,
  usable: false,
  effectSource: {
    roomId: "room:p021",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 21,
    ruling: "R-161",
  },
  specialRegions: [
    {
      areaId: "A",
      iconId: "4591aebebd",
      effect: "riteOfTheChosen",
      status: "confirmed",
      printedText:
        "{icon:62d166a84f} Rite of the Chosen: When a Monster ends its turn here, all Monsters {icon:731f6665d0} 5 and Heroes {icon:df38279161} +1 plus an additional {icon:9b00e692ba} +1 / Negative Quirk.",
      runtimeReady: false,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "F",
      defensive: "F",
      ranged: "F",
      support: "F",
    },
    monsters: {
      aggressive: "E",
      defensive: "G",
      ranged: "C",
      support: "A",
    },
    lootAreas: ["E", "E"],
    markers: [
      ["F", "7b8c742c86", "hero_aggressive_start"],
      ["F", "1a71d94723", "hero_defensive_start"],
      ["F", "7ab26866fc", "hero_ranged_start"],
      ["F", "39d6ddf024", "hero_support_start"],
      ["E", "8787ebb1b2", "monster_aggressive_start"],
      ["G", "1f26dc63eb", "monster_defensive_start"],
      ["C", "643d396fef", "monster_ranged_start"],
      ["A", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [
    ["A", 4, "high"],
    ["B", 4, "normal"],
    ["C", 3, "normal"],
    ["D", 4, "normal"],
    ["E", 3, "normal"],
    ["F", 4, "normal"],
    ["G", 4, "normal"],
    ["H", 3, "normal"],
  ].map(([id, capacity, elevation]) => ({ id, capacity, elevation })),
  edges: [
    ["A", "B", false],
    ["A", "C", false],
    ["A", "D", false],
    ["B", "C", false],
    ["B", "F", false],
    ["C", "D", false],
    ["C", "E", false],
    ["D", "H", false],
    ["E", "G", false],
    ["F", "G", false],
    ["G", "H", false],
    ["B", "E", true],
    ["D", "E", true],
    ["E", "F", true],
    ["E", "H", true],
  ].map(([from, to, cornerOnly]) => ({ from, to, cornerOnly, blocked: false })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedTempleOfTheChosen);
export const templeOfTheChosenSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-161获批几何、部署或效果来源漂移" });
});
