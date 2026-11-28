import type { RawFile } from "../../shared/extract/raw";
import {
  COVE_TILES_FRONT,
  coveBossRoomTileCatalogSchema,
  coveNormalRoomTileCatalogSchema,
  coveRoomTileCatalogFileSchema,
  type CoveRoomTileCatalogEntry,
} from "./room-tile";
import type { CoveRoomCard } from "../rooms/room";

const GEOMETRY_PENDING = "R-048：板块几何、容量、邻接与部署标记未核准";
const BACK_PENDING =
  "待确认：DD_COVE_TILES_BACK.pdf 未提供；该面印刷来源与房间号尚未对照印刷面核实";
const BOSS_TILE_PENDING = "Cove Boss 板块留待专属 Boss 刀核准；不得进入普通板块牌堆";

/** 与 Weald 同版式：FRONT 奇数房，预期 BACK 偶数房（背面未入库时不发明来源）。 */
const FRONT_BY_SHEET_PAGE: Readonly<Record<number, number>> = {
  1: 1,
  2: 3,
  3: 5,
  4: 7,
  5: 9,
  6: 11,
};
const BACK_BY_SHEET_PAGE: Readonly<Record<number, number>> = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
};

function parsePrintedRoomNumber(spans: readonly { readonly t: string }[]): number | null {
  const digits = spans
    .map((span) => span.t.trim())
    .filter((text) => /^\d{1,2}$/.test(text))
    .map((text) => Number(text));
  const candidate = digits.find((n) => n >= 1 && n <= 12);
  return candidate ?? null;
}

function assertRawTileSheet(raw: RawFile) {
  if (raw.category !== "dungeon_tile" || raw.kind !== "sheet" || raw.cards.length !== 6)
    throw new Error("需要 Cove dungeon_tile raw（6 张 FRONT 版面）");
  const source = raw.sources[0];
  if (
    !source ||
    source.front !== COVE_TILES_FRONT ||
    source.back !== null ||
    source.back_pages !== null
  )
    throw new Error("Cove 板块 raw 必须只登记 FRONT 来源，且 back 为空");
}

function lookupRoom(rooms: readonly CoveRoomCard[], number: number): CoveRoomCard {
  const card = rooms.find((entry) => entry.number === number);
  if (!card) throw new Error(`Cove 房间目录缺少 ${number} 号，无法绑定板块名称`);
  return card;
}

function pendingTile(
  room: CoveRoomCard,
  sheetPage: number,
  extra: readonly string[],
): CoveRoomTileCatalogEntry {
  const base = {
    id: `room_tile:cove:${String(room.number).padStart(2, "0")}`,
    rawId: `dungeon_tile:cove:p${String(sheetPage).padStart(3, "0")}`,
    roomId: room.id,
    location: "cove" as const,
    number: room.number,
    name: room.name,
    source: { status: "pending" as const, reason: BACK_PENDING },
    printedRoomNumber: null,
    geometryVerified: false as const,
    geometryComplete: false as const,
    usable: false as const,
    runtimeReady: false as const,
    pendingReview: [BACK_PENDING, GEOMETRY_PENDING, ...extra],
  };
  if (room.boss) {
    return coveBossRoomTileCatalogSchema.parse({
      ...base,
      boss: true,
      poolEligible: false,
      classificationEvidence: [
        `房间卡 ${room.id} 已按印刷 BOSS 标签登记（${room.classificationEvidence?.[0] ?? "room.json"})`,
        `预期 BACK p${sheetPage} 对应 Boss 板块 ${room.number} 号（待印刷面确认）`,
      ],
      pendingReview: [...base.pendingReview, BOSS_TILE_PENDING],
    });
  }
  return coveNormalRoomTileCatalogSchema.parse({
    ...base,
    boss: false,
    poolEligible: true,
    pendingReview: [...base.pendingReview, "Q-186：Cove 普通板块待 Kyries 逐面核准"],
  });
}

function verifiedFrontTile(
  room: CoveRoomCard,
  sheetPage: number,
  printedRoomNumber: number,
): CoveRoomTileCatalogEntry {
  const base = {
    id: `room_tile:cove:${String(room.number).padStart(2, "0")}`,
    rawId: `dungeon_tile:cove:p${String(sheetPage).padStart(3, "0")}`,
    roomId: room.id,
    location: "cove" as const,
    number: room.number,
    name: room.name,
    source: {
      status: "verified" as const,
      file: COVE_TILES_FRONT,
      page: sheetPage,
      face: "front" as const,
    },
    printedRoomNumber,
    geometryVerified: false as const,
    geometryComplete: false as const,
    usable: false as const,
    runtimeReady: false as const,
    pendingReview: [GEOMETRY_PENDING],
  };
  if (room.boss) {
    return coveBossRoomTileCatalogSchema.parse({
      ...base,
      boss: true,
      poolEligible: false,
      classificationEvidence: [
        `FRONT p${sheetPage} 印刷数字 ${printedRoomNumber} 与板块号一致`,
        `房间卡 ${room.id} 为 Boss 房；印刷正文含 BOSS（房间目录）`,
      ],
      pendingReview: [...base.pendingReview, BOSS_TILE_PENDING],
    });
  }
  return coveNormalRoomTileCatalogSchema.parse({
    ...base,
    boss: false,
    poolEligible: true,
    pendingReview: [...base.pendingReview, "Q-186：Cove 普通板块待 Kyries 逐面核准"],
  });
}

/** 十二张 Cove 板块印刷身份：六张 FRONT 已对照，六张 BACK 待确认。 */
export function buildCoveRoomTiles(raw: RawFile, rooms: readonly CoveRoomCard[]) {
  assertRawTileSheet(raw);
  if (rooms.length !== 12) throw new Error("需要完整 Cove 房间目录（12 张）绑定板块名称");

  const tiles: CoveRoomTileCatalogEntry[] = [];
  for (const card of raw.cards) {
    const page = card.faces.front.page;
    const printed = parsePrintedRoomNumber(card.faces.front.spans);
    const frontRoom = FRONT_BY_SHEET_PAGE[page];
    const backRoom = BACK_BY_SHEET_PAGE[page];
    if (!frontRoom || !backRoom) throw new Error(`未登记的 Cove 板块版面 p${page}`);
    if (printed === null) throw new Error(`Cove FRONT p${page} 无法解析房间号数字`);
    if (printed !== frontRoom)
      throw new Error(`Cove FRONT p${page} 印刷号 ${printed} 与预期 ${frontRoom} 不一致`);

    const frontRoomCard = lookupRoom(rooms, frontRoom);
    const backRoomCard = lookupRoom(rooms, backRoom);
    tiles.push(verifiedFrontTile(frontRoomCard, page, printed));
    tiles.push(pendingTile(backRoomCard, page, []));
  }

  tiles.sort((a, b) => a.number - b.number);
  return coveRoomTileCatalogFileSchema.parse({
    schema: "ddbg-cove-room-tile-catalog-v0",
    category: "cove_room_tile_catalog",
    sources: {
      front: COVE_TILES_FRONT,
      back: null,
      backPending: "盒内未见 DD_COVE_TILES_BACK.pdf；背面板块待 Kyries 提供印刷面后核准",
    },
    tiles,
  });
}
