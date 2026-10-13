import { z } from "zod";
import { iconIdSchema } from "../extract/common";

const areaId = z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]);
const placement = z.strictObject({
  areaId,
  iconId: iconIdSchema,
  semantic: z.enum([
    "hero_support_start",
    "hero_ranged_start",
    "hero_defensive_start",
    "hero_aggressive_start",
    "monster_support_start",
    "monster_ranged_start",
    "monster_defensive_start",
    "monster_aggressive_start",
    "loot_chest",
  ]),
  status: z.literal("confirmed"),
});

/** VQ-01–05及R-067本面Unholy Aura获批；禁疗运行时就绪前不可参战。 */
export const tortureChamberSchema = z
  .strictObject({
    id: z.literal("room_tile:p002:back"),
    rawId: z.literal("dungeon_tile:p002"),
    roomId: z.literal("room:p002"),
    location: z.literal("ruins"),
    number: z.literal(2),
    name: z.literal("Torture Chamber"),
    source: z.strictObject({
      file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
      page: z.literal(2),
      face: z.literal("back"),
    }),
    ruling: z.literal("R-048"),
    approval: z.literal("Kyries/Grok 2026-10-12 VQ-01–05"),
    geometryVerified: z.literal(true),
    usable: z.literal(false),
    deployment: z.strictObject({
      printReview: z.literal("verified"),
      heroes: z.strictObject({
        aggressive: z.literal("H"),
        defensive: z.literal("H"),
        ranged: z.literal("H"),
        support: z.literal("H"),
      }),
      monsters: z.strictObject({
        aggressive: z.literal("D"),
        defensive: z.literal("D"),
        ranged: z.literal("E"),
        support: z.literal("C"),
      }),
      lootAreas: z.tuple([z.literal("A"), z.literal("B"), z.literal("E")]),
      markers: z.array(placement).length(11),
    }),
    specialRegions: z.tuple([
      z.strictObject({
        areaId: z.literal("H"),
        iconId: z.literal("4591aebebd"),
        effect: z.literal("unholyAura"),
        status: z.literal("confirmed"),
        printedText: z.literal("Unholy Aura: Heroes in this Area can't heal or be healed."),
        runtimeReady: z.literal(false),
      }),
    ]),
    areas: z
      .array(
        z.strictObject({
          id: areaId,
          capacity: z.int().nonnegative(),
          elevation: z.literal("normal"),
        }),
      )
      .length(8),
    edges: z.array(
      z.strictObject({ from: areaId, to: areaId, cornerOnly: z.boolean(), blocked: z.boolean() }),
    ),
    unresolvedMarkers: z.tuple([]),
  })
  .superRefine((tile, ctx) => {
    const ids = new Set(tile.areas.map((a) => a.id));
    const pairs = tile.edges.map((e) => [e.from, e.to].sort().join(":"));
    if (
      ids.size !== 8 ||
      new Set(pairs).size !== pairs.length ||
      tile.edges.some((e) => e.from === e.to)
    )
      ctx.addIssue({ code: "custom", message: "Torture 区域或边重复 / 自连" });
    const markers = tile.deployment.markers
      .map((m) => `${m.areaId}:${m.iconId}:${m.semantic}`)
      .sort();
    const expected = approvedTorturePlacements
      .map((m) => `${m.areaId}:${m.iconId}:${m.semantic}`)
      .sort();
    if (JSON.stringify(markers) !== JSON.stringify(expected))
      ctx.addIssue({ code: "custom", message: "VQ-03 / 04 本面标记放置漂移" });
  });

const approvedTorturePlacements = [
  { areaId: "H", iconId: "39d6ddf024", semantic: "hero_support_start" },
  { areaId: "H", iconId: "7ab26866fc", semantic: "hero_ranged_start" },
  { areaId: "H", iconId: "1a71d94723", semantic: "hero_defensive_start" },
  { areaId: "H", iconId: "7b8c742c86", semantic: "hero_aggressive_start" },
  { areaId: "C", iconId: "293f170eab", semantic: "monster_support_start" },
  { areaId: "E", iconId: "643d396fef", semantic: "monster_ranged_start" },
  { areaId: "D", iconId: "1f26dc63eb", semantic: "monster_defensive_start" },
  { areaId: "D", iconId: "8787ebb1b2", semantic: "monster_aggressive_start" },
  ...["A", "B", "E"].map((areaId) => ({ areaId, iconId: "f9f205b9e1", semantic: "loot_chest" })),
];

export const approvedTortureChamber = tortureChamberSchema.parse({
  id: "room_tile:p002:back",
  rawId: "dungeon_tile:p002",
  roomId: "room:p002",
  location: "ruins",
  number: 2,
  name: "Torture Chamber",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 2, face: "back" },
  ruling: "R-048",
  approval: "Kyries/Grok 2026-10-12 VQ-01–05",
  geometryVerified: true,
  usable: false,
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "H", defensive: "H", ranged: "H", support: "H" },
    monsters: { aggressive: "D", defensive: "D", ranged: "E", support: "C" },
    lootAreas: ["A", "B", "E"],
    markers: approvedTorturePlacements.map((m) => ({ ...m, status: "confirmed" })),
  },
  specialRegions: [
    {
      areaId: "H",
      iconId: "4591aebebd",
      effect: "unholyAura",
      status: "confirmed",
      printedText: "Unholy Aura: Heroes in this Area can't heal or be healed.",
      runtimeReady: false,
    },
  ],
  areas: [2, 2, 3, 4, 2, 3, 3, 4].map((capacity, i) => ({
    id: "ABCDEFGH"[i],
    capacity,
    elevation: "normal",
  })),
  edges: [
    ...["AC", "BC", "BF", "CD", "CF", "DE", "DG", "DH", "EG", "GH"].map((pair) => ({
      from: pair[0],
      to: pair[1],
      cornerOnly: false,
      blocked: false,
    })),
    ...["AB", "AE"].map((pair) => ({
      from: pair[0],
      to: pair[1],
      cornerOnly: true,
      blocked: false,
    })),
    { from: "F", to: "H", cornerOnly: true, blocked: true },
    ...["CH", "FD"].map((pair) => ({
      from: pair[0],
      to: pair[1],
      cornerOnly: false,
      blocked: true,
    })),
  ],
  unresolvedMarkers: [],
});
