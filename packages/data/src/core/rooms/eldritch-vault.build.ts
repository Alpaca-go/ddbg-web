import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";

export const eldritchVaultEffectLines = [
  printLine("{print:area_marker@312} : A Hero can spend 2 actions"),
  "here and draw one Level 3 Trinket",
  "per Hero in play. Equipping one of",
  printLine("those Trinkets causes {print:stress@305} +2."),
] as const;

export function assertEldritchVaultEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p016");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 16 ||
    JSON.stringify(card.faces.front.lines.slice(-4).map((l) => l.text)) !==
      JSON.stringify(eldritchVaultEffectLines) ||
    !card.faces.front.icons.some((i) => i.iconId === printIcon("stress", 305)) ||
    !card.faces.front.icons.some((i) => i.iconId === printIcon("area_marker", 312))
  )
    throw new Error("Eldritch Vault Room p16来源或效果行漂移（R-156）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:darkest:03"),
  rawId: z.literal("dungeon_tile:p010"),
  roomId: z.literal("room:darkest:03"),
  location: z.literal("darkestDungeon"),
  number: z.literal(3),
  name: z.literal("Eldritch Vault"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(10),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-156"),
  geometryVerified: z.literal(true),
  usable: z.literal(true),
  effectSource: z.strictObject({
    roomId: z.literal("room:darkest:03"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(16),
    ruling: z.literal("R-156"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.literal("E"),
      iconId: z.literal(printIcon("area_marker", 435)),
      effect: z.literal("eldritchVaultTrinkets"),
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

// R-156：几何与 Eldritch Vault 饰品交互均已接通，可参战。
export const approvedEldritchVault = tileShape.parse({
  id: "room_tile:darkest:03",
  rawId: "dungeon_tile:p010",
  roomId: "room:darkest:03",
  location: "darkestDungeon",
  number: 3,
  name: "Eldritch Vault",
  source: {
    file: "DD_COREBOX_TILES_FRONT.pdf",
    page: 10,
    face: "front",
  },
  ruling: "R-156",
  geometryVerified: true,
  usable: true,
  effectSource: {
    roomId: "room:darkest:03",
    file: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf",
    page: 16,
    ruling: "R-156",
  },
  specialRegions: [
    {
      areaId: "E",
      iconId: printIcon("area_marker", 435),
      effect: "eldritchVaultTrinkets",
      status: "confirmed",
      printedText: printLine(
        "{print:area_marker@312} : A Hero can spend 2 actions here and draw one Level 3 Trinket per Hero in play. Equipping one of those Trinkets causes {print:stress@305} +2.",
      ),
      runtimeReady: true,
    },
  ],
  deployment: {
    printReview: "verified",
    heroes: {
      aggressive: "C",
      defensive: "F",
      ranged: "I",
      support: "A",
    },
    monsters: {
      aggressive: "H",
      defensive: "B",
      ranged: "D",
      support: "G",
    },
    lootAreas: [],
    markers: [
      [
        "C",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
        "hero_aggressive_start",
      ],
      [
        "F",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
        "hero_defensive_start",
      ],
      [
        "I",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
        "hero_ranged_start",
      ],
      [
        "A",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        "hero_support_start",
      ],
      [
        "H",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
        "monster_aggressive_start",
      ],
      [
        "B",
        printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
        "monster_defensive_start",
      ],
      ["D", printIcon("stance_ranged_monster_slot", 808), "monster_ranged_start"],
      ["G", printIcon("stance_support_monster_slot", 216), "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: "ABCDEFGHI".split("").map((id) => ({
    id,
    capacity: "ACFI".includes(id) ? 4 : 2,
    elevation: "BDEGH".includes(id) ? "high" : "normal",
  })),
  edges: ["A-B", "B-E", "C-D", "D-E", "E-G", "E-H", "F-G", "H-I"].map((pair) => ({
    from: pair[0],
    to: pair[2],
    cornerOnly: false,
    blocked: false,
  })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedEldritchVault);
export const eldritchVaultSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-156获批几何、部署或效果来源漂移" });
});
