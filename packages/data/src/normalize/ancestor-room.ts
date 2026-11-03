import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";
const approvedRoomLines = [
  "{icon:51a56b9bb3} 12—Ancestor Room",
  "{icon:4da7b87bf8}",
  "{icon:3b95c5fc7a}",
  "{icon:6cc69f00ff} {icon:e0c8d4381a} 12",
  "{icon:4cd99e2a5c} {icon:812394dcdd}",
  "{icon:7992756c4a}",
  "{icon:ec5b6362c8}",
  "{icon:d176185d66}",
  "{icon:0591dde355}",
  "{icon:3b95c5fc7a}",
  "{icon:812394dcdd}",
  "{icon:5867540e37}",
  "{icon:38668d05ef}",
  "{icon:d6bd70c31a} {icon:90da148d08}",
  "BOSS",
];
export function assertAncestorRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p025");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 25 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-165：Ancestor Room p25来源或无额外卡文记录漂移");
}
const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p014:back"),
  rawId: z.literal("dungeon_tile:p014"),
  roomId: z.literal("room:p025"),
  location: z.literal("darkestDungeon"),
  number: z.literal(12),
  name: z.literal("Ancestor Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(14),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-165"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p025"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(25),
    ruling: z.literal("R-165"),
  }),
  specialRegions: z.array(z.never()),
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

// R-165仅批准图面，最终战形态切换与Boss运行时准入仍单独核实。
export const approvedAncestorRoom = tileShape.parse({
  id: "room_tile:p014:back",
  rawId: "dungeon_tile:p014",
  roomId: "room:p025",
  location: "darkestDungeon",
  number: 12,
  name: "Ancestor Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 14, face: "back" },
  ruling: "R-165",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:p025", file: ROOM_FRONT, page: 25, ruling: "R-165" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "K", defensive: "I", ranged: "K", support: "C" },
    monsters: { aggressive: "E", defensive: "B", ranged: "A", support: "J" },
    lootAreas: [],
    markers: [
      ["K", "7b8c742c86", "hero_aggressive_start"],
      ["I", "1a71d94723", "hero_defensive_start"],
      ["K", "7ab26866fc", "hero_ranged_start"],
      ["C", "39d6ddf024", "hero_support_start"],
      ["E", "8787ebb1b2", "monster_aggressive_start"],
      ["B", "1f26dc63eb", "monster_defensive_start"],
      ["A", "643d396fef", "monster_ranged_start"],
      ["J", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [3, 4, 2, 3, 3, 3, 3, 3, 2, 4, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: "normal",
  })),
  edges: [
    ..."A-B A-D B-C B-E B-F C-F D-E D-G E-F E-G E-H F-H G-I G-J H-J H-K I-J J-K"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-D E-J"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedAncestorRoom);
export const ancestorRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-165获批几何、部署或来源漂移" });
});
