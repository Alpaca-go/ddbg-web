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
  ruling: z.literal("R-065"),
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
      effect: z.enum(["healingWaters"]),
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
];

/** 深度锁定获批整面；不能只改usable、出生、特殊区域或来源绕过审批。 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const approvedExtraRuinsTileSchema = tileShape.superRefine((tile, ctx) => {
  const approved = approvedExtraRuinsTiles.find((t) => t.id === tile.id);
  if (!approved || canonical(tile) !== canonical(approved))
    ctx.addIssue({ code: "custom", message: "R-065获批面/完整运行时记录漂移，不批准改写" });
});
