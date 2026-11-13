import type { RawFile } from "../extract/raw";
import {
  WEALD_ROOM_FRONT,
  WEALD_ROOM_BACK,
  WEALD_TILES_FRONT,
  WEALD_TILES_BACK,
  wealdRoomFileSchema,
  wealdRoomTileGeometryFileSchema,
  wealdRoomTileSchema,
  type WealdRoomTile,
} from "../weald-room";

const MARKER = {
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

const ORANGE_STAR = "ea307609d9";
const GREEN_STAR = "41c31d63d8";

type Stance = WealdRoomTile["deployment"]["heroes"];
type Monsters = WealdRoomTile["deployment"]["monsters"];

function markers(heroes: Stance, monsters: Monsters, loot: readonly string[]) {
  return [
    ...(["hero", "monster"] as const).flatMap((side) =>
      (["aggressive", "defensive", "ranged", "support"] as const).map((s) => {
        const semantic = `${side}_${s}_start` as keyof typeof MARKER;
        return {
          areaId: (side === "hero" ? heroes : monsters)[s],
          iconId: MARKER[semantic],
          semantic,
          status: "confirmed" as const,
        };
      }),
    ),
    ...loot.map((areaId) => ({
      areaId,
      iconId: MARKER.loot_chest,
      semantic: "loot_chest",
      status: "confirmed" as const,
    })),
  ];
}

function edges(passages: readonly string[], corners: readonly string[] = []) {
  const list = [
    ...passages.map((pair) => {
      const [from, to] = pair.split("-");
      return { from: from!, to: to!, cornerOnly: false, blocked: false };
    }),
    ...corners.map((pair) => {
      const [from, to] = pair.split("-");
      return { from: from!, to: to!, cornerOnly: true, blocked: false };
    }),
  ];
  return list;
}

function areas(
  rows: readonly { id: string; capacity: number; elevation?: "low" | "normal" | "high" }[],
) {
  return rows.map((row) => ({
    id: row.id,
    capacity: row.capacity,
    elevation: row.elevation ?? "normal",
    ...(row.capacity === 0 ? { zeroCapacity: true as const } : {}),
  }));
}

function tile(
  input: Omit<WealdRoomTile, "location" | "usable" | "unresolvedMarkers" | "deployment"> & {
    heroes: Stance;
    monsters: Monsters;
    lootAreas: readonly string[];
  },
): WealdRoomTile {
  const { heroes, monsters, lootAreas, ...rest } = input;
  return wealdRoomTileSchema.parse({
    ...rest,
    location: "weald",
    usable: false,
    unresolvedMarkers: [],
    deployment: {
      printReview: "verified",
      heroes,
      monsters,
      lootAreas: [...lootAreas],
      markers: markers(heroes, monsters, lootAreas),
    },
  });
}

const APPROVED_TILES: readonly WealdRoomTile[] = [
  tile({
    id: "room_tile:weald:p001:front",
    rawId: "dungeon_tile:weald:p001",
    roomId: "room:weald:p001",
    number: 1,
    name: "Fungal Spores",
    source: { file: WEALD_TILES_FRONT, page: 1, face: "front" },
    ruling: "R-239",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "G", defensive: "G", ranged: "G", support: "G" },
    monsters: { aggressive: "F", defensive: "C", ranged: "A", support: "B" },
    lootAreas: ["E"],
    areas: areas([
      { id: "A", capacity: 6 },
      { id: "B", capacity: 6 },
      { id: "C", capacity: 3 },
      { id: "D", capacity: 3 },
      { id: "E", capacity: 3 },
      { id: "F", capacity: 4 },
      { id: "G", capacity: 5 },
      { id: "H", capacity: 3 },
    ]),
    edges: edges(
      ["A-B", "A-C", "A-E", "B-E", "B-F", "C-E", "D-G", "E-F", "F-G", "F-H", "G-H"],
      ["C-D", "E-G"],
    ),
    necroticFungusAreas: [],
    zeroCapacityAreas: [],
    specialRegions: ["C", "E", "F", "G"].map((areaId) => ({
      areaId,
      iconId: ORANGE_STAR,
      effect: "toxicMushrooms" as const,
      status: "confirmed" as const,
      printedText: "Toxic Mushrooms: 怪物攻击该区域英雄未命中时，仅该区域所有英雄 1 腐蚀 2t",
      runtimeReady: false as const,
    })),
    wallNotes: [],
  }),
  tile({
    id: "room_tile:weald:p002:back",
    rawId: "dungeon_tile:weald:p001",
    roomId: "room:weald:p002",
    number: 2,
    name: "Ambush",
    source: { file: WEALD_TILES_BACK, page: 1, face: "back" },
    ruling: "R-237",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "E", defensive: "E", ranged: "E", support: "E" },
    monsters: { aggressive: "G", defensive: "I", ranged: "G", support: "F" },
    lootAreas: ["C"],
    areas: areas([
      { id: "A", capacity: 4 },
      { id: "B", capacity: 2, elevation: "high" },
      { id: "C", capacity: 3 },
      { id: "D", capacity: 4 },
      { id: "E", capacity: 6 },
      { id: "F", capacity: 4 },
      { id: "G", capacity: 5 },
      { id: "H", capacity: 3, elevation: "low" },
      { id: "I", capacity: 5 },
    ]),
    edges: edges(
      ["A-B", "A-D", "B-E", "C-F", "D-G", "E-H", "F-I", "G-H", "G-I", "H-I"],
      ["A-E", "D-H", "F-H"],
    ),
    necroticFungusAreas: [],
    zeroCapacityAreas: [],
    specialRegions: [],
    wallNotes: ["B–C 竖缝", "D–E 竖缝", "E–F 竖缝"],
  }),
  tile({
    id: "room_tile:weald:p003:front",
    rawId: "dungeon_tile:weald:p002",
    roomId: "room:weald:p003",
    number: 3,
    name: "Thick Woods",
    source: { file: WEALD_TILES_FRONT, page: 2, face: "front" },
    ruling: "R-237",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "C", defensive: "F", ranged: "J", support: "J" },
    monsters: { aggressive: "H", defensive: "G", ranged: "B", support: "E" },
    lootAreas: ["A", "D", "I", "K"],
    areas: areas([
      { id: "A", capacity: 2 },
      { id: "B", capacity: 2 },
      { id: "C", capacity: 4 },
      { id: "D", capacity: 2 },
      { id: "E", capacity: 2 },
      { id: "F", capacity: 5 },
      { id: "G", capacity: 3 },
      { id: "H", capacity: 3 },
      { id: "I", capacity: 2 },
      { id: "J", capacity: 4 },
      { id: "K", capacity: 2 },
    ]),
    edges: edges(
      ["A-B", "B-C", "B-E", "C-D", "C-E", "C-F", "E-F", "F-G", "F-H", "G-I", "H-K", "J-K"],
      ["A-E", "G-J", "H-J"],
    ),
    necroticFungusAreas: ["B", "G"],
    zeroCapacityAreas: [],
    specialRegions: [],
    wallNotes: ["F–J 横向黑块", "I–J 竖缝", "E 下方／G 上方黑块", "D 下方／H 上方黑块"],
  }),
  tile({
    id: "room_tile:weald:p004:back",
    rawId: "dungeon_tile:weald:p002",
    roomId: "room:weald:p004",
    number: 4,
    name: "Stash",
    source: { file: WEALD_TILES_BACK, page: 2, face: "back" },
    ruling: "R-237",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "G", defensive: "F", ranged: "A", support: "I" },
    monsters: { aggressive: "C", defensive: "H", ranged: "B", support: "D" },
    lootAreas: ["D"],
    areas: areas([
      { id: "A", capacity: 4 },
      { id: "B", capacity: 4 },
      { id: "C", capacity: 3 },
      { id: "D", capacity: 3 },
      { id: "E", capacity: 2, elevation: "low" },
      { id: "F", capacity: 6 },
      { id: "G", capacity: 4 },
      { id: "H", capacity: 3 },
      { id: "I", capacity: 3 },
    ]),
    edges: edges(
      ["A-B", "B-C", "B-F", "C-F", "D-E", "E-F", "F-H", "F-I", "G-H", "H-I"],
      ["B-E", "E-H"],
    ),
    necroticFungusAreas: [],
    zeroCapacityAreas: [],
    specialRegions: [
      {
        areaId: "D",
        iconId: ORANGE_STAR,
        effect: "precious",
        status: "confirmed",
        printedText: "Precious: 怪物在 D 结束回合时其他怪物增益 2t ×2",
        runtimeReady: false,
      },
    ],
    wallNotes: ["A 下方横向黑块", "D／E 下方与 G 上方横向黑块"],
  }),
  tile({
    id: "room_tile:weald:p005:front",
    rawId: "dungeon_tile:weald:p003",
    roomId: "room:weald:p005",
    number: 5,
    name: "Infected Oak",
    source: { file: WEALD_TILES_FRONT, page: 3, face: "front" },
    ruling: "R-238",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "F", defensive: "C", ranged: "H", support: "G" },
    monsters: { aggressive: "E", defensive: "A", ranged: "G", support: "B" },
    lootAreas: ["B", "D"],
    areas: areas([
      { id: "A", capacity: 3 },
      { id: "B", capacity: 4 },
      { id: "C", capacity: 3 },
      { id: "D", capacity: 4 },
      { id: "E", capacity: 2 },
      { id: "F", capacity: 3 },
      { id: "G", capacity: 2 },
      { id: "H", capacity: 4 },
      { id: "I", capacity: 0, elevation: "normal" },
    ]),
    edges: edges(
      ["A-B", "A-D", "B-C", "B-I", "C-E", "D-F", "D-I", "E-H", "E-I", "F-G", "G-H", "G-I"],
      ["A-I", "B-D", "B-E", "C-I", "D-G", "E-G", "F-I", "H-I"],
    ),
    necroticFungusAreas: [],
    zeroCapacityAreas: ["I"],
    specialRegions: ["B", "D", "E", "G"].map((areaId) => ({
      areaId,
      iconId: ORANGE_STAR,
      effect: "poisonousRoots" as const,
      status: "confirmed" as const,
      printedText: "Poisonous Roots: 英雄在该区域结束回合受到 2 腐蚀 2t",
      runtimeReady: true as const,
    })),
    wallNotes: ["G 下方黑色矩形缺口"],
  }),
  tile({
    id: "room_tile:weald:p006:back",
    rawId: "dungeon_tile:weald:p003",
    roomId: "room:weald:p006",
    number: 6,
    name: "Chase in the Woods",
    source: { file: WEALD_TILES_BACK, page: 3, face: "back" },
    ruling: "R-238",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "G", defensive: "A", ranged: "H", support: "D" },
    monsters: { aggressive: "F", defensive: "E", ranged: "C", support: "B" },
    lootAreas: ["H"],
    areas: areas([
      { id: "A", capacity: 5 },
      { id: "B", capacity: 6 },
      { id: "C", capacity: 3 },
      { id: "D", capacity: 4 },
      { id: "E", capacity: 2 },
      { id: "F", capacity: 6 },
      { id: "G", capacity: 5 },
      { id: "H", capacity: 2 },
    ]),
    edges: edges(["A-B", "A-C", "A-E", "B-D", "C-F", "D-F", "D-H", "E-G", "F-G"], ["B-C", "F-H"]),
    necroticFungusAreas: ["A", "C", "D"],
    zeroCapacityAreas: [],
    specialRegions: [],
    wallNotes: ["B 下方／C 上方", "E 与 C／F 间竖块", "C–D 竖块", "F–H 竖块"],
  }),
  tile({
    id: "room_tile:weald:p007:front",
    rawId: "dungeon_tile:weald:p004",
    roomId: "room:weald:p007",
    number: 7,
    name: "Chasm",
    source: { file: WEALD_TILES_FRONT, page: 4, face: "front" },
    ruling: "R-239",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "F", defensive: "G", ranged: "F", support: "E" },
    monsters: { aggressive: "D", defensive: "C", ranged: "A", support: "B" },
    lootAreas: ["A", "B"],
    areas: areas([
      { id: "A", capacity: 4, elevation: "high" },
      { id: "B", capacity: 3 },
      { id: "C", capacity: 2 },
      { id: "D", capacity: 2 },
      { id: "E", capacity: 4 },
      { id: "F", capacity: 5 },
      { id: "G", capacity: 2 },
      { id: "H", capacity: 0 },
      { id: "I", capacity: 0 },
      { id: "J", capacity: 0 },
    ]),
    edges: edges(
      [
        "A-C",
        "A-D",
        "B-H",
        "B-I",
        "C-H",
        "D-E",
        "D-H",
        "D-J",
        "E-F",
        "E-G",
        "E-H",
        "E-J",
        "F-I",
        "G-J",
        "H-I",
      ],
      ["A-H", "C-D", "E-I", "F-H"],
    ),
    necroticFungusAreas: [],
    zeroCapacityAreas: ["H", "I", "J"],
    specialRegions: [],
    wallNotes: ["A–B 矩形缺口"],
  }),
  tile({
    id: "room_tile:weald:p008:back",
    rawId: "dungeon_tile:weald:p004",
    roomId: "room:weald:p008",
    number: 8,
    name: "Fungal Overgrowth",
    source: { file: WEALD_TILES_BACK, page: 4, face: "back" },
    ruling: "R-238",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "I", defensive: "I", ranged: "G", support: "H" },
    monsters: { aggressive: "H", defensive: "D", ranged: "C", support: "D" },
    lootAreas: ["A", "B"],
    areas: areas([
      { id: "A", capacity: 3 },
      { id: "B", capacity: 3, elevation: "low" },
      { id: "C", capacity: 3 },
      { id: "D", capacity: 4 },
      { id: "E", capacity: 4 },
      { id: "F", capacity: 2 },
      { id: "G", capacity: 3 },
      { id: "H", capacity: 3, elevation: "low" },
      { id: "I", capacity: 6 },
    ]),
    edges: edges(
      ["A-B", "B-E", "C-D", "D-E", "D-I", "E-F", "E-H", "E-I", "F-G", "G-H", "H-I"],
      ["A-E", "B-D", "E-G", "F-H"],
    ),
    necroticFungusAreas: ["C", "E"],
    zeroCapacityAreas: [],
    specialRegions: [],
    wallNotes: ["A 下方／F 上方", "B 右至 C 左缺口", "H 下方至 G／I 底间缺口"],
  }),
  tile({
    id: "room_tile:weald:p009:front",
    rawId: "dungeon_tile:weald:p005",
    roomId: "room:weald:p009",
    number: 9,
    name: "The Clearing",
    source: { file: WEALD_TILES_FRONT, page: 5, face: "front" },
    ruling: "R-238",
    geometryVerified: true,
    geometryComplete: true,
    pendingReview: [],
    heroes: { aggressive: "A", defensive: "A", ranged: "C", support: "C" },
    monsters: { aggressive: "E", defensive: "D", ranged: "G", support: "B" },
    lootAreas: ["B"],
    areas: areas([
      { id: "A", capacity: 2 },
      { id: "B", capacity: 6 },
      { id: "C", capacity: 2 },
      { id: "D", capacity: 4 },
      { id: "E", capacity: 4 },
      { id: "F", capacity: 3, elevation: "low" },
      { id: "G", capacity: 3, elevation: "high" },
    ]),
    edges: edges(["A-D", "B-F", "C-E", "D-F", "E-F", "F-G"], ["B-D", "B-E", "D-G", "E-G"]),
    necroticFungusAreas: [],
    zeroCapacityAreas: [],
    specialRegions: [
      {
        areaId: "B",
        iconId: GREEN_STAR,
        effect: "clearingHere",
        status: "confirmed",
        printedText: "Clearing: 英雄在 B 结束回合恢复 1 压力；怪物在 B 结束回合随机移除一个宝箱",
        runtimeReady: false,
      },
      {
        areaId: "B",
        iconId: GREEN_STAR,
        effect: "clearingOurs",
        status: "confirmed",
        printedText: "Ours!: 英雄拾取宝箱时所有怪物减益 1t、增益 2t（范围沿用 R-234，不限于 B）",
        runtimeReady: false,
      },
    ],
    wallNotes: ["A–B、B–C 竖缝", "B 左右下角横向凹口"],
  }),
];

const EFFECTS: Record<
  number,
  {
    summary: string;
    binding: "pending" | "partial" | "confirmed";
    ruling: "R-234" | "R-237" | "R-238" | "R-239";
  }
> = {
  1: {
    summary: "Toxic Mushrooms: 攻击未命中时该区域英雄 1 腐蚀 2t",
    binding: "confirmed",
    ruling: "R-239",
  },
  2: {
    summary: "Unprepared!: 战斗开始英雄减益 2t",
    binding: "confirmed",
    ruling: "R-234",
  },
  4: {
    summary: "Precious: 怪物在 D 结束回合使其他怪物增益 2t ×2",
    binding: "confirmed",
    ruling: "R-237",
  },
  5: {
    summary: "Poisonous Roots: 英雄在 B/D/E/G 结束回合 2 腐蚀 2t",
    binding: "confirmed",
    ruling: "R-238",
  },
  8: {
    summary: "Abyssal Puff: 本房间真菌被摧毁时所有怪物增益 2t",
    binding: "confirmed",
    ruling: "R-234",
  },
  9: {
    summary: "Ours! + Clearing（B 绿星绑定）",
    binding: "confirmed",
    ruling: "R-238",
  },
};

export function buildWealdRoomTiles() {
  return wealdRoomTileGeometryFileSchema.parse({
    schema: "ddbg-weald-room-tile-geometry-v0",
    category: "weald_room_tile_geometry",
    tiles: APPROVED_TILES,
  });
}

export function buildWealdRooms(raw: RawFile) {
  if (raw.category !== "room" || raw.cards.length !== 12)
    throw new Error("需要完整 Weald Room raw（12 面）");
  const cards = raw.cards
    .filter((card) => card.faces.front.page <= 9)
    .map((card) => {
      const front = card.faces.front;
      if (
        front.file !== WEALD_ROOM_FRONT ||
        card.faces.back?.file !== WEALD_ROOM_BACK ||
        card.faces.back.page !== front.page ||
        card.copies !== 1 ||
        card.id !== `room:weald:p${String(front.page).padStart(3, "0")}`
      )
        throw new Error("Weald 房间来源、页码或 ID 不一致");
      const lines = front.lines.map((line) => line.text);
      const titleLine =
        lines.find((line) =>
          new RegExp(`^\\s*(?:\\{icon:[^}]+\\}\\s*)*${front.page}[—–-]`).test(line),
        ) ?? lines[0]!;
      const title = titleLine.replace(/\s*\{icon:[^}]+\}/g, "").trim();
      const name = title.replace(/^\d+\s*[—–-]\s*/, "").trim();
      if (!name) throw new Error(`Weald 房间 p${front.page} 无法从印刷行解析名称`);
      const meta = EFFECTS[front.page];
      return {
        id: card.id,
        name,
        copies: card.copies as 1,
        location: "weald" as const,
        number: front.page,
        boss: false as const,
        printedLines: lines,
        source: { front: WEALD_ROOM_FRONT, back: WEALD_ROOM_BACK, page: front.page },
        verifiedEffect: meta
          ? {
              ruling: meta.ruling,
              summary: meta.summary,
              runtimeReady: false as const,
              effectAreaBinding: meta.binding,
            }
          : null,
        pendingReview: [],
      };
    })
    .sort((a, b) => a.number - b.number);
  return wealdRoomFileSchema.parse({ schema: "ddbg-weald-room-v1", cards });
}

export function assertWealdRoomsPackIsolated() {
  for (const tile of APPROVED_TILES) {
    if (tile.location !== "weald" || !tile.roomId.startsWith("room:weald:"))
      throw new Error("Weald 板块地点命名空间漂移");
  }
}
