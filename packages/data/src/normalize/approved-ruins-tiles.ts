import { z } from "zod";
import { iconIdSchema } from "../extract/common";

const stance = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.string(),
  rawId: z.string(),
  roomId: z.string(),
  location: z.literal("ruins"),
  number: z.int().min(3).max(9),
  name: z.string(),
  source: z.strictObject({
    file: z.string(),
    page: z.int().positive(),
    face: z.enum(["front", "back"]),
  }),
  ruling: z.enum(["R-065", "R-066"]),
  approval: z.literal("Kyries/Grok 2026-10-13"),
  geometryVerified: z.literal(true),
  usable: z.boolean(),
  deployment: z.strictObject({
    printReview: z.literal("verified"),
    heroes: stance,
    monsters: stance,
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
  specialRegions: z.array(
    z.strictObject({
      areaId: z.string(),
      iconId: iconIdSchema,
      effect: z.enum([
        "healingWaters",
        "stressfulDarkness",
        "beaconOfLight",
        "circleOfPower",
        "spikedPit",
        "lootTheChest",
        "hideAndHeal",
        "ancestorGlory",
        "theInvokers",
        "invokingAbyss",
        "feelingThePresence",
      ]),
      status: z.literal("confirmed"),
      printedText: z.string(),
      runtimeReady: z.boolean(),
    }),
  ),
  areas: z.array(
    z.strictObject({
      id: z.string(),
      capacity: z.int().positive(),
      elevation: z.enum(["high", "normal", "low"]),
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
    z.strictObject({ areaId: z.string(), iconId: iconIdSchema, semantic: z.null() }),
  ),
});
type ApprovedTile = z.infer<typeof tileShape>;
const markerIds = {
  hero_aggressive_start: "7b8c742c86",
  hero_defensive_start: "1a71d94723",
  hero_ranged_start: "7ab26866fc",
  hero_support_start: "39d6ddf024",
  monster_aggressive_start: "8787ebb1b2",
  monster_defensive_start: "1f26dc63eb",
  monster_ranged_start: "643d396fef",
  monster_support_start: "293f170eab",
  loot_chest: "f9f205b9e1",
} as const;
function placements(
  heroes: ApprovedTile["deployment"]["heroes"],
  monsters: ApprovedTile["deployment"]["monsters"],
  loot: readonly string[],
) {
  return [
    ...(["hero", "monster"] as const).flatMap((side) =>
      (["aggressive", "defensive", "ranged", "support"] as const).map((s) => {
        const semantic = `${side}_${s}_start` as keyof typeof markerIds;
        return {
          areaId: (side === "hero" ? heroes : monsters)[s],
          iconId: markerIds[semantic],
          semantic,
          status: "confirmed" as const,
        };
      }),
    ),
    ...loot.map((areaId) => ({
      areaId,
      iconId: markerIds.loot_chest,
      semantic: "loot_chest",
      status: "confirmed" as const,
    })),
  ];
}
const fountainHeroes = { aggressive: "I", defensive: "J", ranged: "J", support: "I" };
const fountainMonsters = { aggressive: "D", defensive: "E", ranged: "C", support: "A" };
const edges = (pairs: readonly string[], cornerOnly = false, blocked = false) =>
  pairs.map((pair) => {
    const [from, to] = pair.split("-");
    return { from: from!, to: to!, cornerOnly, blocked };
  });

function numberedAreas(
  prefix: string,
  capacities: readonly number[],
  high: readonly string[] = [],
) {
  return capacities.map((capacity, i) => ({
    id: `${prefix}${i + 1}`,
    capacity,
    elevation: high.includes(`${prefix}${i + 1}`) ? ("high" as const) : ("normal" as const),
  }));
}
function approvedTile(input: {
  number: number;
  name: string;
  page: number;
  face: "front" | "back";
  heroes: ApprovedTile["deployment"]["heroes"];
  monsters: ApprovedTile["deployment"]["monsters"];
  lootAreas: readonly string[];
  areas: ApprovedTile["areas"];
  edges: ApprovedTile["edges"];
  specialRegions: readonly Omit<
    ApprovedTile["specialRegions"][number],
    "status" | "runtimeReady"
  >[];
  ruling?: "R-065" | "R-066";
  runtimeReady?: true;
}): ApprovedTile {
  const pageId = `p${String(input.page).padStart(3, "0")}`;
  return tileShape.parse({
    id: `room_tile:${pageId}:${input.face}`,
    rawId: `dungeon_tile:${pageId}`,
    roomId: `room:p${String(input.number).padStart(3, "0")}`,
    location: "ruins",
    number: input.number,
    name: input.name,
    source: {
      file: `DD_COREBOX_TILES_${input.face.toUpperCase()}.pdf`,
      page: input.page,
      face: input.face,
    },
    ruling: input.ruling ?? "R-065",
    approval: "Kyries/Grok 2026-10-13",
    geometryVerified: true,
    usable: input.runtimeReady === true,
    deployment: {
      printReview: "verified",
      heroes: input.heroes,
      monsters: input.monsters,
      lootAreas: input.lootAreas,
      markers: placements(input.heroes, input.monsters, input.lootAreas),
    },
    specialRegions: input.specialRegions.map((r) => ({
      ...r,
      status: "confirmed",
      runtimeReady: input.runtimeReady === true,
    })),
    areas: input.areas,
    edges: input.edges,
    unresolvedMarkers: [],
  });
}

/** R-065/VQ-06：仅本面获批位置；不全局解释同形星号。 */
export const approvedExtraRuinsTiles: readonly ApprovedTile[] = [
  tileShape.parse({
    id: "room_tile:p002:front",
    rawId: "dungeon_tile:p002",
    roomId: "room:p003",
    location: "ruins",
    number: 3,
    name: "Healing Fountain",
    source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 2, face: "front" },
    ruling: "R-065",
    approval: "Kyries/Grok 2026-10-13",
    geometryVerified: true,
    usable: true,
    deployment: {
      printReview: "verified",
      heroes: fountainHeroes,
      monsters: fountainMonsters,
      lootAreas: [],
      markers: placements(fountainHeroes, fountainMonsters, []),
    },
    specialRegions: [
      {
        areaId: "G",
        iconId: "0d13b745be",
        effect: "healingWaters",
        status: "confirmed",
        printedText: "Healing Waters: Heroes ending their turn here heal 3.",
        runtimeReady: true,
      },
    ],
    areas: [2, 4, 2, 3, 3, 3, 3, 3, 2, 2].map((capacity, i) => ({
      id: "ABCDEFGHIJ"[i],
      capacity,
      elevation: i === 0 || i === 2 ? "high" : "normal",
    })),
    edges: [
      ...edges(["A-B", "B-C", "B-D", "B-E", "D-F", "E-H", "F-G", "G-H", "F-I", "H-J"]),
      ...edges(["D-G", "E-G", "G-I", "G-J"], true),
      ...edges(["A-D", "C-E", "I-J"], false, true),
    ],
    unresolvedMarkers: [],
  }),
  tileShape.parse({
    id: "room_tile:p003:front",
    rawId: "dungeon_tile:p003",
    roomId: "room:p005",
    location: "ruins",
    number: 5,
    name: "Beacon of Light",
    source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 3, face: "front" },
    ruling: "R-065",
    approval: "Kyries/Grok 2026-10-13",
    geometryVerified: true,
    usable: true,
    deployment: {
      printReview: "verified",
      heroes: { aggressive: "L6", defensive: "L7", ranged: "L6", support: "L7" },
      monsters: { aggressive: "L1", defensive: "L5", ranged: "L1", support: "L2" },
      lootAreas: ["L9"],
      markers: placements(
        { aggressive: "L6", defensive: "L7", ranged: "L6", support: "L7" },
        { aggressive: "L1", defensive: "L5", ranged: "L1", support: "L2" },
        ["L9"],
      ),
    },
    specialRegions: [
      ...["L1", "L3", "L6", "L7", "L9"].map((areaId) => ({
        areaId,
        iconId: "4591aebebd",
        effect: "stressfulDarkness",
        status: "confirmed",
        printedText: "Stressful Darkness: Heroes ending their turn here suffer +1 Stress.",
        runtimeReady: true,
      })),
      {
        areaId: "L2",
        iconId: "0d13b745be",
        effect: "beaconOfLight",
        status: "confirmed",
        printedText: "Beacon of Light: Heroes ending their turn here recover 1 Stress.",
        runtimeReady: true,
      },
    ],
    areas: [4, 4, 3, 2, 3, 2, 2, 2, 2].map((capacity, i) => ({
      id: `L${i + 1}`,
      capacity,
      elevation: "normal",
    })),
    edges: edges(["L1-L3", "L1-L4", "L2-L5", "L3-L6", "L4-L5", "L4-L7", "L5-L8", "L8-L9"]),
    unresolvedMarkers: [],
  }),

  approvedTile({
    number: 4,
    name: "Spiked Pit",
    runtimeReady: true,
    page: 3,
    face: "back",
    ruling: "R-066",
    heroes: { aggressive: "S11", defensive: "S11", ranged: "S12", support: "S10" },
    monsters: { aggressive: "S5", defensive: "S3", ranged: "S1", support: "S5" },
    lootAreas: ["S1", "S3"],
    areas: numberedAreas("S", [2, 4, 3, 3, 3, 2, 2, 4, 2, 3, 3, 3], ["S1"]),
    edges: [
      ...edges([
        "S2-S4",
        "S3-S6",
        "S4-S5",
        "S4-S8",
        "S5-S8",
        "S5-S9",
        "S6-S7",
        "S7-S9",
        "S8-S9",
        "S8-S10",
        "S8-S11",
        "S9-S11",
        "S9-S12",
        "S10-S11",
        "S11-S12",
      ]),
      ...edges(["S1-S2", "S5-S7"], false, true),
    ],
    specialRegions: [
      {
        areaId: "S5",
        iconId: "4591aebebd",
        effect: "circleOfPower",
        printedText: "Circle of Power: Monsters ending their turn here heal 4.",
      },
      ...["S8", "S9"].map((areaId) => ({
        areaId,
        iconId: "4591aebebd",
        effect: "spikedPit" as const,
        printedText:
          "Spiked Pit: Heroes and Monsters that are Shuffled or standing here at the end of their turn take Damage 3 and suffer Bleed 1 / 3t.",
      })),
    ],
  }),
  approvedTile({
    number: 6,
    name: "Treasure Chamber",
    runtimeReady: true,
    page: 4,
    face: "back",
    heroes: { aggressive: "T8", defensive: "T3", ranged: "T8", support: "T3" },
    monsters: { aggressive: "T2", defensive: "T5", ranged: "T9", support: "T1" },
    lootAreas: ["T4"],
    areas: numberedAreas("T", [2, 4, 3, 2, 4, 2, 2, 3, 3]),
    edges: [
      ...edges(["T1-T2", "T1-T5", "T2-T3", "T2-T5", "T5-T6", "T5-T7", "T7-T9", "T8-T9"]),
      ...edges(["T4-T5"], false, true),
    ],
    specialRegions: [
      {
        areaId: "T5",
        iconId: "e2fc407791",
        effect: "lootTheChest",
        printedText: "Loot the Chest: Spend 2 actions here to draw a Trinket. Once per battle.",
      },
      {
        areaId: "T6",
        iconId: "e2fc407791",
        effect: "hideAndHeal",
        printedText:
          "Hide and Heal: If there are no Monsters in this Area, spend 1 action here and suffer Stress +2 to remove all Wounds.",
      },
    ],
  }),
  approvedTile({
    number: 7,
    name: "Tomb of Ancestor",
    runtimeReady: true,
    page: 4,
    face: "front",
    heroes: { aggressive: "A7", defensive: "A3", ranged: "A3", support: "A3" },
    monsters: { aggressive: "A9", defensive: "A4", ranged: "A1", support: "A4" },
    lootAreas: ["A1", "A9"],
    areas: numberedAreas("A", [2, 2, 4, 3, 4, 2, 3, 2, 3]),
    edges: [
      ...edges(["A1-A2", "A2-A3", "A2-A4", "A4-A5", "A4-A6", "A5-A6", "A6-A8", "A7-A8", "A8-A9"]),
      ...edges(["A1-A4", "A3-A4", "A6-A7", "A6-A9"], true),
    ],
    specialRegions: [
      {
        areaId: "A4",
        iconId: "e2fc407791",
        effect: "ancestorGlory",
        printedText:
          "Ancestor's Glory: Heroes standing here are immune to Blight, Bleed, Debuff, Stun, Mark and Shuffle. Remove any of these Conditions if already applied.",
      },
    ],
  }),
  approvedTile({
    number: 8,
    name: "Invocation Chamber",
    runtimeReady: true,
    page: 5,
    face: "back",
    heroes: { aggressive: "I9", defensive: "I9", ranged: "I10", support: "I10" },
    monsters: { aggressive: "I5", defensive: "I3", ranged: "I1", support: "I2" },
    lootAreas: ["I2", "I7"],
    areas: numberedAreas("I", [4, 2, 3, 4, 2, 3, 2, 3, 4, 3]),
    edges: [
      ...edges(["I1-I3", "I2-I5", "I3-I4", "I4-I5", "I3-I6", "I4-I7", "I5-I8", "I6-I9", "I8-I10"]),
      ...edges(["I1-I4", "I2-I4", "I3-I7", "I4-I8"], true),
    ],
    specialRegions: [
      {
        areaId: "I4",
        iconId: "4591aebebd",
        effect: "theInvokers",
        printedText:
          "The Invokers: The last Monster each round always moves towards this Area instead of step 2 of the Monster's turn.",
      },
      {
        areaId: "I4",
        iconId: "4591aebebd",
        effect: "invokingAbyss",
        printedText:
          "Invoking Abyss: At the end of a round, if there are Monsters in this Area, all four Heroes suffer Stress +2.",
      },
    ],
  }),
  approvedTile({
    number: 9,
    name: "Old Abbey",
    runtimeReady: true,
    page: 5,
    face: "front",
    heroes: { aggressive: "O8", defensive: "O8", ranged: "O8", support: "O8" },
    monsters: { aggressive: "O5", defensive: "O5", ranged: "O2", support: "O3" },
    lootAreas: ["O2", "O3"],
    areas: numberedAreas("O", [4, 3, 2, 3, 4, 3, 2, 4, 2]),
    edges: [
      ...edges([
        "O1-O2",
        "O1-O3",
        "O1-O5",
        "O2-O4",
        "O3-O6",
        "O4-O7",
        "O6-O9",
        "O5-O8",
        "O7-O8",
        "O8-O9",
      ]),
      ...edges(["O2-O5", "O3-O5", "O5-O7", "O5-O9"], true),
      ...edges(["O4-O5", "O5-O6"], false, true),
    ],
    specialRegions: ["O1", "O5"].map((areaId) => ({
      areaId,
      iconId: "4591aebebd",
      effect: "feelingThePresence" as const,
      printedText:
        "Feeling the Presence: Heroes ending their turn here suffer Stress +1 per Negative Quirk and heal 1 / Hero Level per Positive Quirk.",
    })),
  }),
];

/** 深度锁定获批整面；不能只改usable、出生、特殊区域或来源绕过审批。 */
// 两边均已过同一strictObject投影，字段顺序固定；只预计算获批常量，不缓存外部输入。
const approvedFingerprints = new Map(
  approvedExtraRuinsTiles.map((tile) => [tile.id, JSON.stringify(tile)]),
);
export const approvedExtraRuinsTileSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedFingerprints.get(tile.id))
    ctx.addIssue({ code: "custom", message: "R-065/R-066获批面/完整运行时记录漂移，不批准改写" });
});
