import type { RawFile } from "../../shared/extract/raw";
import {
  COVE_TILES_BACK,
  COVE_TILES_FRONT,
  coveBossRoomTileCatalogSchema,
  coveNormalRoomTileCatalogSchema,
  coveRoomTileCatalogFileSchema,
  type CoveRoomTileCatalogEntry,
} from "./room-tile";
import type { CoveRoomCard } from "../rooms/room";

const GEOMETRY_PENDING = "R-048：板块几何、容量、邻接与部署标记未核准";
const BOSS_TILE_PENDING = "Cove Boss 板块留待专属 Boss 刀核准；不得进入普通板块牌堆";
const Q186 = "Q-186：Cove 普通板块几何提案待 Kyries 逐面核准";

/** 与 Weald 同版式：FRONT 奇数房，BACK 偶数房（同 sheet 页）。 */
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
    throw new Error("需要 Cove dungeon_tile raw（6 张 sheet 版面）");
  const source = raw.sources[0];
  if (
    !source ||
    source.front !== COVE_TILES_FRONT ||
    source.back !== COVE_TILES_BACK ||
    source.back_pages !== 6
  )
    throw new Error("Cove 板块 raw 必须登记 FRONT/BACK 各 6 页");
}

function lookupRoom(rooms: readonly CoveRoomCard[], number: number): CoveRoomCard {
  const card = rooms.find((entry) => entry.number === number);
  if (!card) throw new Error(`Cove 房间目录缺少 ${number} 号，无法绑定板块名称`);
  return card;
}

function verifiedTile(
  room: CoveRoomCard,
  sheetPage: number,
  printedRoomNumber: number,
  face: "front" | "back",
): CoveRoomTileCatalogEntry {
  const file = face === "front" ? COVE_TILES_FRONT : COVE_TILES_BACK;
  const base = {
    id: `room_tile:cove:${String(room.number).padStart(2, "0")}`,
    rawId: `dungeon_tile:cove:p${String(sheetPage).padStart(3, "0")}`,
    roomId: room.id,
    location: "cove" as const,
    number: room.number,
    name: room.name,
    source: {
      status: "verified" as const,
      file,
      page: sheetPage,
      face,
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
        `${face.toUpperCase()} p${sheetPage} 印刷数字 ${printedRoomNumber} 与板块号一致`,
        `房间卡 ${room.id} 为 Boss 房；印刷正文含 BOSS（房间目录）`,
      ],
      pendingReview: [...base.pendingReview, BOSS_TILE_PENDING],
    });
  }
  return coveNormalRoomTileCatalogSchema.parse({
    ...base,
    boss: false,
    poolEligible: true,
    pendingReview: [...base.pendingReview, Q186],
  });
}

/** 十二张 Cove 板块印刷身份：FRONT/BACK 六页各对照房间号。 */
export function buildCoveRoomTiles(raw: RawFile, rooms: readonly CoveRoomCard[]) {
  assertRawTileSheet(raw);
  if (rooms.length !== 12) throw new Error("需要完整 Cove 房间目录（12 张）绑定板块名称");

  const tiles: CoveRoomTileCatalogEntry[] = [];
  for (const card of raw.cards) {
    const page = card.faces.front.page;
    const frontPrinted = parsePrintedRoomNumber(card.faces.front.spans);
    const backFace = card.faces.back;
    if (!backFace) throw new Error(`Cove dungeon_tile ${card.id} 缺少 BACK 面`);
    const backPrinted = parsePrintedRoomNumber(backFace.spans);
    const frontRoom = FRONT_BY_SHEET_PAGE[page];
    const backRoom = BACK_BY_SHEET_PAGE[page];
    if (!frontRoom || !backRoom) throw new Error(`未登记的 Cove 板块版面 p${page}`);
    if (frontPrinted === null) throw new Error(`Cove FRONT p${page} 无法解析房间号数字`);
    if (backPrinted === null) throw new Error(`Cove BACK p${page} 无法解析房间号数字`);
    if (frontPrinted !== frontRoom)
      throw new Error(`Cove FRONT p${page} 印刷号 ${frontPrinted} 与预期 ${frontRoom} 不一致`);
    if (backPrinted !== backRoom)
      throw new Error(`Cove BACK p${page} 印刷号 ${backPrinted} 与预期 ${backRoom} 不一致`);

    const frontRoomCard = lookupRoom(rooms, frontRoom);
    const backRoomCard = lookupRoom(rooms, backRoom);
    tiles.push(verifiedTile(frontRoomCard, page, frontPrinted, "front"));
    tiles.push(verifiedTile(backRoomCard, page, backPrinted, "back"));
  }

  tiles.sort((a, b) => a.number - b.number);
  return coveRoomTileCatalogFileSchema.parse({
    schema: "ddbg-cove-room-tile-catalog-v0",
    category: "cove_room_tile_catalog",
    sources: {
      front: COVE_TILES_FRONT,
      back: COVE_TILES_BACK,
    },
    tiles,
  });
}
