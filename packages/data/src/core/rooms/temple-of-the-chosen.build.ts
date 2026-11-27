import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";

export const templeOfTheChosenEffectLines = [
  printLine("{print:area_marker@223} Rite of the Chosen: When"),
  "a Monster ends its turn here, all",
  printLine("Monsters {print:heal@225} 5 and Heroes {print:stress@305} +1 plus an"),
  printLine("additional {print:stress@145} +1 / Negative Quirk."),
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
    [
      printIcon("area_marker", 223),
      printIcon("heal", 225),
      printIcon("stress", 305),
      printIcon("stress", 145),
    ].some((id) => !card.faces.front.icons.some((i) => i.iconId === id))
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
  id: z.literal("room_tile:darkest:08"),
  rawId: z.literal("dungeon_tile:p012"),
  roomId: z.literal("room:darkest:08"),
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
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:08"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(21),
    ruling: z.literal("R-161"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.literal("A"),
      iconId: z.literal(printSourceIcon("corebox/raw/room.json:room:p002:front:22")),
      effect: z.literal("riteOfTheChosen"),
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

// R-161：本面几何与卡文来源已批准；Rite of the Chosen运行时未接通。
export const approvedTempleOfTheChosen = tileShape.parse({
  id: "room_tile:darkest:08",
  rawId: "dungeon_tile:p012",
  roomId: "room:darkest:08",
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
  usable: true,
  effectSource: {
    roomId: "room:darkest:08",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 21,
    ruling: "R-161",
  },
  specialRegions: [
    {
      areaId: "A",
      iconId: printSourceIcon("corebox/raw/room.json:room:p002:front:22"),
      effect: "riteOfTheChosen",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@223} Rite of the Chosen: When a Monster ends its turn here, all Monsters {print:heal@225} 5 and Heroes {print:stress@305} +1 plus an additional {print:stress@145} +1 / Negative Quirk.",
      ),
      runtimeReady: true,
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
      [
        "F",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "F",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "F",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "F",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "E",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "G",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["C", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["A", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
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
