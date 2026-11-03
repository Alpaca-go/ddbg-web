import { z } from "zod";
import { iconIdSchema } from "../extract/common";
import type { RawFile } from "../extract/raw";
import { ROOM_FRONT } from "../room";
const approvedRoomLines = [
  "{icon:f2d3273b1d} 10—Necromancer Room",
  "{icon:e5687383fd}",
  "{icon:700c7def3e} 10",
  "{icon:1ec04dbd9e}",
  "{icon:7fb9964d4f}",
  "{icon:9a6a3eaf3c}",
  "{icon:d18c59a65d}",
  "{icon:6cc69f00ff}",
  "{icon:089f2d63e3}",
  "{icon:6cc69f00ff}",
  "{icon:d4d6e375b6} {icon:67c08f463c} {icon:44d632b1cc} {icon:e128e21432}",
  "BOSS",
];
export function assertNecromancerRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p010");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 10 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-166：Necromancer Room p10来源或无额外卡文记录漂移");
}
const placements = z.strictObject({
  aggressive: z.string(),
  defensive: z.string(),
  ranged: z.string(),
  support: z.string(),
});
const tileShape = z.strictObject({
  id: z.literal("room_tile:p006:back"),
  rawId: z.literal("dungeon_tile:p006"),
  roomId: z.literal("room:p010"),
  location: z.literal("ruins"),
  number: z.literal(10),
  name: z.literal("Necromancer Room"),
  source: z.strictObject({
    file: z.literal("DD_COREBOX_TILES_BACK.pdf"),
    page: z.literal(6),
    face: z.literal("back"),
  }),
  ruling: z.literal("R-166"),
  geometryVerified: z.literal(true),
  usable: z.literal(false),
  effectSource: z.strictObject({
    roomId: z.literal("room:p010"),
    file: z.literal(ROOM_FRONT),
    page: z.literal(10),
    ruling: z.literal("R-166"),
  }),
  specialRegions: z.array(z.never()),
  deployment: z.strictObject({
    printReview: z.literal("verified"),
    heroes: placements,
    monsters: z.strictObject({ aggressive: z.literal("A") }),
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

// R-166仅批准图面，Boss运行时准入仍单独核实。
export const approvedNecromancerRoom = tileShape.parse({
  id: "room_tile:p006:back",
  rawId: "dungeon_tile:p006",
  roomId: "room:p010",
  location: "ruins",
  number: 10,
  name: "Necromancer Room",
  source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 6, face: "back" },
  ruling: "R-166",
  geometryVerified: true,
  usable: false,
  effectSource: { roomId: "room:p010", file: ROOM_FRONT, page: 10, ruling: "R-166" },
  specialRegions: [],
  deployment: {
    printReview: "verified",
    heroes: { aggressive: "G", defensive: "G", ranged: "G", support: "G" },
    monsters: { aggressive: "A" },
    lootAreas: [],
    markers: [
      ["G", "7b8c742c86", "hero_aggressive_start"],
      ["G", "1a71d94723", "hero_defensive_start"],
      ["G", "7ab26866fc", "hero_ranged_start"],
      ["G", "39d6ddf024", "hero_support_start"],
      ["A", "8787ebb1b2", "monster_aggressive_start"],
    ].map(([areaId, iconId, semantic]) => ({ areaId, iconId, semantic, status: "confirmed" })),
  },
  areas: [3, 4, 3, 4, 3, 2, 4, 2].map((capacity, i) => ({
    id: String.fromCharCode(65 + i),
    capacity,
    elevation: i === 0 ? "high" : "normal",
  })),
  edges: [
    ..."A-C B-C B-E B-F C-D C-E D-E D-H E-G F-G G-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: false, blocked: false })),
    ..."A-B A-D B-G D-G E-F E-H"
      .split(" ")
      .map((pair) => ({ from: pair[0], to: pair[2], cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});
const approvedProjection = JSON.stringify(approvedNecromancerRoom);
export const necromancerRoomSchema = tileShape.superRefine((tile, ctx) => {
  if (JSON.stringify(tile) !== approvedProjection)
    ctx.addIssue({ code: "custom", message: "R-166获批几何、部署或来源漂移" });
});
