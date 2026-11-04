import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";
const approvedRoomLines = [
  "{icon:f2d3273b1d} 12—Collector Room",
  "{icon:d18c59a65d}",
  "{icon:700c7def3e} 12",
  "{icon:d9c7603861}",
  "{icon:38668d05ef}",
  "{icon:67c08f463c} {icon:71cd10f39d}",
  "{icon:d9c7603861}",
  "{icon:6cc69f00ff}",
  "{icon:4cd99e2a5c}",
  "{icon:0591dde355}",
  "{icon:6cc69f00ff}",
  "{icon:6cc69f00ff}",
  "{icon:812394dcdd}",
  "{icon:7e288c22e5} ! {icon:7e288c22e5} ! {icon:7e288c22e5} !",
  "{icon:7992756c4a}",
  "{icon:d4d6e375b6} {icon:90da148d08}",
  "BOSS",
];
export function assertCollectorRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p012");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 12 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-168：Collector Room p12来源或无额外卡文记录漂移");
}
const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p007:back"),
  rawId: z.literal("dungeon_tile:p007"),
  roomId: z.literal("room:p012"),
  location: z.literal("ruins"),
  number: z.literal(12),
  name: z.literal("Collector Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(7),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-168"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p012"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(12),
    ruling: z.literal("R-168"),
  }),
  specialRegions: z.array(z.never()),
  printedLoot: z.strictObject({
    areaId: z.literal("F"),
    count: z.literal(3),
    iconId: z.literal("f9f205b9e1"),
    overlayIconId: z.literal("6c5de8d976"),
    printedOverlay: z.literal("!"),
    runtimeReady: z.literal(true),
  }),
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

// R-168图面；F区三宝箱交互见 R-177。Boss准入与 room usable 仍单独核实。
export const approvedCollectorRoom = tileShape.parse({
  id: "room_tile:p007:back",
  rawId: "dungeon_tile:p007",
  roomId: "room:p012",
  location: "ruins",
  number: 12,
  name: "Collector Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 7, face: "back" },
  ruling: "R-168",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:p012", file: ROOM_FRONT, page: 12, ruling: "R-168" },
  specialRegions: [],
  printedLoot: {
    areaId: "F",
    count: 3,
    iconId: "f9f205b9e1",
    overlayIconId: "6c5de8d976",
    printedOverlay: "!",
    runtimeReady: true,
  },
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "H", defensive: "B", ranged: "B", support: "H" },
    monsters: { aggressive: "C", defensive: "G", ranged: "E", support: "A" },
    lootAreas: ["F", "F", "F"],
    markers: [
      ["H", "7b8c742c86", "hero_aggressive_start"],
      ["B", "1a71d94723", "hero_defensive_start"],
      ["B", "7ab26866fc", "hero_ranged_start"],
      ["H", "39d6ddf024", "hero_support_start"],
      ["C", "8787ebb1b2", "monster_aggressive_start"],
      ["G", "1f26dc63eb", "monster_defensive_start"],
      ["E", "643d396fef", "monster_ranged_start"],
      ["A", "293f170eab", "monster_support_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [2, 3, 3, 2, 2, 2, 2, 3].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: "normal",
  })),
  edges: [
    ..."A-C B-D C-D C-E C-G E-F G-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."B-C C-F C-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedCollectorRoom);
export const collectorRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-168获批几何、部署或来源漂移" });
});

const approvedTileLines = [
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:700c7def3e} 12",
  "{icon:b33a662094}",
  "{icon:b33a662094}",
  "{icon:293f170eab}",
  "{icon:7ab26866fc} {icon:1a71d94723}",
  "{icon:b609dfb7d1}",
  "{icon:b33a662094} {icon:b33a662094}",
  "{icon:b609dfb7d1}",
  "{icon:61819484ab}",
  "{icon:b33a662094}",
  "{icon:b33a662094}",
  "{icon:643d396fef}",
  "{icon:8787ebb1b2}",
  "{icon:61819484ab}",
  "{icon:b609dfb7d1}",
  "{icon:3c26a2a89f} {icon:c95cdba266}",
  "{icon:61819484ab}",
  "{icon:61819484ab}",
  "{icon:b609dfb7d1}",
  "{icon:f9f205b9e1} {icon:6c5de8d976} ! {icon:f9f205b9e1} {icon:6c5de8d976} ! {icon:f9f205b9e1} {icon:6c5de8d976} !",
  "{icon:1f26dc63eb}",
  "{icon:39d6ddf024} {icon:7b8c742c86}",
];
export function assertCollectorTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p007")?.faces.back;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    ["f9f205b9e1", "6c5de8d976"].some(
      (id) => face.icons.filter((i) => i.iconId === id).length !== 3,
    )
  )
    throw new Error("R-168：收藏家三宝箱、叹号与印刷编号漂移");
}
