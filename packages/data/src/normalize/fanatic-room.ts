import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";
const approvedRoomLines = [
  "{icon:2e22db7a98} 13—Fanatic Room",
  "{icon:4da7b87bf8}",
  "{icon:e5687383fd}",
  "{icon:812394dcdd}",
  "{icon:700c7def3e} 13",
  "{icon:324b070464}",
  "{icon:ec5b6362c8}",
  "{icon:089f2d63e3}",
  "{icon:9a6a3eaf3c}",
  "{icon:1dbb20856f} {icon:71cd10f39d}",
  "{icon:d18c59a65d}",
  "{icon:9990256f37} {icon:ba026d4b74}",
  "{icon:d18c59a65d}",
  "{icon:d6bd70c31a} {icon:90da148d08}",
  "BOSS",
];
export function assertFanaticRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p013");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 13 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-169：Fanatic Room p13来源或无额外卡文记录漂移");
}
const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p007:front"),
  rawId: z.literal("dungeon_tile:p007"),
  roomId: z.literal("room:p013"),
  location: z.literal("ruins"),
  number: z.literal(13),
  name: z.literal("Fanatic Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
    page: z.literal(7),
    face: z.literal("front"),
  }),
  ruling: z.literal("R-169"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p013"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(13),
    ruling: z.literal("R-169"),
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

// R-169仅批准图面，Boss运行时准入仍单独核实。
export const approvedFanaticRoom = tileShape.parse({
  id: "room_tile:p007:front",
  rawId: "dungeon_tile:p007",
  roomId: "room:p013",
  location: "ruins",
  number: 13,
  name: "Fanatic Room",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 7, face: "front" },
  ruling: "R-169",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:p013", file: ROOM_FRONT, page: 13, ruling: "R-169" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "H", defensive: "A", ranged: "H", support: "C" },
    monsters: { aggressive: "B", defensive: "B", ranged: "E", support: "E" },
    lootAreas: [],
    markers: [
      ["H", "7b8c742c86", "hero_aggressive_start"],
      ["A", "1a71d94723", "hero_defensive_start"],
      ["H", "7ab26866fc", "hero_ranged_start"],
      ["C", "39d6ddf024", "hero_support_start"],
      ["B", "8787ebb1b2", "monster_aggressive_start"],
      ["B", "1f26dc63eb", "monster_defensive_start"],
      ["E", "643d396fef", "monster_ranged_start"],
      ["E", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [3, 3, 3, 4, 3, 4, 3, 3, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: i === 1 ? "high" : "normal",
  })),
  edges: [
    ..."A-B A-D B-C B-E C-F D-E D-G E-F E-H F-I G-H H-I"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-D B-F D-H E-G E-I F-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedFanaticRoom);
export const fanaticRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-169获批几何、部署或来源漂移" });
});

const approvedTileLines = [
  "{icon:bfdc8aa323} {icon:b33a662094} {icon:bfdc8aa323} {icon:98ecd549c4}",
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:bfdc8aa323} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:700c7def3e} 13",
  "{icon:1a71d94723}",
  "{icon:39d6ddf024}",
  "{icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:bfdc8aa323} {icon:bfdc8aa323}",
  "{icon:bfdc8aa323} {icon:b609dfb7d1}",
  "{icon:bfdc8aa323} {icon:61819484ab}",
  "{icon:8787ebb1b2} {icon:1f26dc63eb}",
  "{icon:b609dfb7d1} {icon:b609dfb7d1}",
  "{icon:61819484ab}",
  "{icon:643d396fef} {icon:293f170eab}",
  "{icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:bfdc8aa323} {icon:bfdc8aa323}",
  "{icon:b33a662094} {icon:b33a662094}",
  "{icon:bfdc8aa323}",
  "{icon:b33a662094}",
  "{icon:3f806f0181}",
  "{icon:7ab26866fc} {icon:7b8c742c86}",
];
export function assertFanaticTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p007")?.faces.front;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    !face.icons.some((i) => i.iconId === "98ecd549c4")
  )
    throw new Error("R-169：狂热者高地、部署与印刷编号漂移");
}
