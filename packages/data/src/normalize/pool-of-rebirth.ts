import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";

// R-145：区域星标按对应Room卡解释；保留原始图标签名，不改全局词典。
export const poolOfRebirthEffectLines = [
  "{icon:62d166a84f} : Heroes ending their turn here suffer",
  "{icon:9b00e692ba} +1 and {icon:731f6665d0} 3 per Negative Quirk.",
  "Special Room Effect: Once the Room",
  "is cleared, Heroes can suffer {icon:df38279161} +4 each,",
  "to revive a dead Hero and place them",
  "in the Stagecoach.",
] as const;

export function assertPoolOfRebirthEffectSource(rooms: RawFile): void {
  const matches = rooms.cards.filter((card) => card.id === "room:p014");
  const card = matches[0];
  if (
    rooms.category !== "room" ||
    matches.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 14 ||
    card.pages.length !== 1 ||
    card.pages[0] !== 14 ||
    card.faces.front.lines[0]?.text !== "{icon:51a56b9bb3} 1—Pool of Rebirth" ||
    ["62d166a84f", "9b00e692ba", "731f6665d0", "df38279161"].some(
      (iconId) => !card.faces.front.icons.some((icon) => icon.iconId === iconId),
    ) ||
    JSON.stringify(card.faces.front.lines.slice(-6).map((line) => line.text)) !==
      JSON.stringify(poolOfRebirthEffectLines)
  )
    throw new Error("Pool of Rebirth对应Room p14身份、来源或效果行漂移（R-145）");
}

const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p009:front"),
  rawId: z.literal("dungeon_tile:p009"),
  roomId: z.literal("room:p014"),
  location: z.literal("darkestDungeon"),
  number: z.literal(1),
  name: z.literal("Pool of Rebirth"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(9),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-144"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p014"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(14),
    ruling: z.literal("R-145"),
  }),
  specialRegions: z.array(
    z.strictObject({
      areaId: z.literal("F"),
      iconId: z.literal("4591aebebd"),
      effect: z.literal("poolOfRebirth"),
      status: z.literal("confirmed"),
      printedText: z.string(),
      runtimeReady: z.literal(true),
    }),
  ),
  specialRoomEffect: z.strictObject({ printedText: z.string(), runtimeReady: z.literal(false) }),
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

// R-144几何、R-145卡文来源、R-146区域结算；整房复活仍未开放。
export const approvedPoolOfRebirth = tileShape.parse({
  id: "room_tile:p009:front",
  rawId: "dungeon_tile:p009",
  roomId: "room:p014",
  location: "darkestDungeon",
  number: 1,
  name: "Pool of Rebirth",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 9, face: "front" },
  ruling: "R-144",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:p014", file: ROOM_FRONT, page: 14, ruling: "R-145" },
  specialRegions: [
    {
      areaId: "F",
      iconId: "4591aebebd",
      effect: "poolOfRebirth",
      status: "confirmed",
      printedText: poolOfRebirthEffectLines.slice(0, 2).join(" "),
      runtimeReady: true,
    },
  ],
  specialRoomEffect: {
    printedText: poolOfRebirthEffectLines.slice(2).join(" "),
    runtimeReady: false,
  },
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "L", defensive: "J", ranged: "C", support: "A" },
    monsters: { aggressive: "E", defensive: "K", ranged: "G", support: "I" },
    lootAreas: [],
    markers: [
      ["L", "7b8c742c86", "hero_aggressive_start"],
      ["J", "1a71d94723", "hero_defensive_start"],
      ["C", "7ab26866fc", "hero_ranged_start"],
      ["A", "39d6ddf024", "hero_support_start"],
      ["E", "8787ebb1b2", "monster_aggressive_start"],
      ["K", "1f26dc63eb", "monster_defensive_start"],
      ["G", "643d396fef", "monster_ranged_start"],
      ["I", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [2, 3, 2, 2, 2, 6, 2, 3, 3, 2, 3, 3].map((capacity, index) => ({
    id: String.fromCharCode(65 + index),
    capacity,
    elevation: index === 6 ? "high" : "normal",
  })),
  edges: [
    ...[
      "A-D",
      "B-C",
      "B-F",
      "C-G",
      "D-E",
      "D-H",
      "E-F",
      "F-G",
      "F-H",
      "F-I",
      "H-J",
      "I-K",
      "I-L",
      "K-L",
    ].map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ...["A-E", "B-E", "B-G", "C-F", "D-F", "E-H", "F-J", "F-K", "G-I"].map((pair) => ({
      from: pair[0],
      to: pair[2],
      cornerOnly: true,
      blocked: false,
    })),
  ],
  unresolvedMarkers: [],
});

// 与既有获批面相同，strictObject投影后锁定整面，不允许扩大本次审批。
const approvedProjection = JSON.stringify(approvedPoolOfRebirth);
export const poolOfRebirthSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-144/R-145获批几何、部署或效果来源漂移，拒绝改写" });
});
