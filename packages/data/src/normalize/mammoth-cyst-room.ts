import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";
const approvedRoomLines = [
  "{icon:51a56b9bb3} 11—Mammoth Cyst Room",
  "{icon:03f929fe29}",
  "{icon:d18c59a65d}",
  "{icon:92c5f40988}",
  "{icon:e0c8d4381a} 11",
  "{icon:9b1134d0b0} 3-4",
  "{icon:9b1134d0b0} 1-2",
  "{icon:9b1134d0b0} 5-6",
  "{icon:812394dcdd}",
  "{icon:812394dcdd}",
  "{icon:3b95c5fc7a}",
  "{icon:9990256f37} {icon:8368f94a97}",
  "{icon:4901fef081}",
  "{icon:e05de4a155}",
  "{icon:4901fef081}",
  "{icon:9b1134d0b0} 9-10",
  "{icon:9b1134d0b0} 7-8",
  "{icon:255187b044}",
  "{icon:255187b044}",
  "{icon:0591dde355} {icon:71cd10f39d}",
  "{icon:71bf6c0f18}",
  "{icon:fef75233ed} {icon:544755f56d} {icon:67c08f463c} {icon:90da148d08}",
  "BOSS",
];
export function assertMammothCystRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p024");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 24 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-164：Mammoth Cyst Room p24来源或无额外卡文记录漂移");
}
export function assertMammothCystTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p014")?.faces.front;
  if (
    !face ||
    face.icons.filter((i) => i.iconId === "9454efcf19").length !== 5 ||
    ["1-2", "3-4", "5-6", "7-8", "9-10"].some(
      (label) => !face.lines.some((l) => l.text === "{icon:9454efcf19} " + label),
    )
  )
    throw new Error("R-164：Mammoth Cyst Room五个紫星或编号漂移");
}
const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p014:front"),
  rawId: z.literal("dungeon_tile:p014"),
  roomId: z.literal("room:p024"),
  location: z.literal("darkestDungeon"),
  number: z.literal(11),
  name: z.literal("Mammoth Cyst Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(14),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-164"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p024"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(24),
    ruling: z.literal("R-164"),
  }),
  specialRegions: z.array(z.never()),
  printedMarkers: z.array(
    z.strictObject({
      areaId: z.string(),
      iconId: z.literal("9454efcf19"),
      color: z.literal("purple"),
      printedRange: z.string(),
      status: z.literal("confirmed"),
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

// R-164批准图面，紫星只记录颜色和印刷编号，不推定运行时效果。
export const approvedMammothCystRoom = tileShape.parse({
  id: "room_tile:p014:front",
  rawId: "dungeon_tile:p014",
  roomId: "room:p024",
  location: "darkestDungeon",
  number: 11,
  name: "Mammoth Cyst Room",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 14, face: "front" },
  ruling: "R-164",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:p024", file: ROOM_FRONT, page: 24, ruling: "R-164" },
  specialRegions: [],
  printedMarkers: [
    ["A", "1-2"],
    ["C", "3-4"],
    ["B", "5-6"],
    ["G", "7-8"],
    ["I", "9-10"],
  ].map(([areaId, printedRange]) => ({
    areaId,
    iconId: "9454efcf19",
    color: "purple",
    printedRange,
    status: "confirmed",
  })),
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "K", defensive: "K", ranged: "K", support: "K" },
    monsters: { aggressive: "H", defensive: "H", ranged: "E", support: "E" },
    lootAreas: [],
    markers: [
      ["K", "7b8c742c86", "hero_aggressive_start"],
      ["K", "1a71d94723", "hero_defensive_start"],
      ["K", "7ab26866fc", "hero_ranged_start"],
      ["K", "39d6ddf024", "hero_support_start"],
      ["H", "8787ebb1b2", "monster_aggressive_start"],
      ["H", "1f26dc63eb", "monster_defensive_start"],
      ["E", "643d396fef", "monster_ranged_start"],
      ["E", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [2, 3, 2, 3, 4, 3, 2, 5, 2, 2, 4, 2].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: "normal",
  })),
  edges: "A-D B-E C-F D-E D-G E-F E-H F-I G-J H-K I-L J-K K-L"
    .split(" ")
    .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedMammothCystRoom);
export const mammothCystRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-164获批几何、部署或印刷标记漂移" });
});
