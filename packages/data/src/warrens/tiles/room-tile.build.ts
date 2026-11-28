import type { RawFile } from "../../shared/extract/raw";
import {
  WARRENS_TILES_BACK,
  WARRENS_TILES_FRONT,
  warrensRoomTileCatalogSchema,
  type WarrensRoomTile,
} from "./room-tile";

const PRINT_LABELS = ["1", "3", "5", "7", "9", "11"] as const;
const ROOM_NAMES = [
  "Putrid Cellar",
  "The Sewage",
  "Infected Storage",
  "Experiment Deposit",
  "Dumped Shinies",
  "Rusted Armory",
] as const;

const PENDING_GEOMETRY =
  "待确认：Warrens 板块背面几何、房间 07–09 对应与部署标记待印核（R-048）；正反面页序已接 BACK PDF";

function printLabel(raw: RawFile, page: number): (typeof PRINT_LABELS)[number] {
  const card = raw.cards.find((c) => c.faces.front.page === page);
  if (!card) throw new Error(`raw 缺少 Warrens 板块 p${page}`);
  const text = card.faces.front.lines
    .map((line) => line.text.replace(/\{icon:[^}]+\}/g, "").trim())
    .join(" ");
  const match = PRINT_LABELS.find((label) => new RegExp(`\\b${label}\\b`).test(text));
  if (!match) throw new Error(`Warrens 板块 p${page} 未找到印刷编号`);
  return match;
}

/** 六张板块按 FRONT p1–p6 顺序映射 room:warrens:01–06（07–09 待后续刀）。 */
export function buildWarrensRoomTiles(raw: RawFile, roomNames: readonly string[] = ROOM_NAMES) {
  if (raw.category !== "dungeon_tile" || raw.cards.length !== 6)
    throw new Error("需要完整 Warrens dungeon_tile raw（6 面）");
  const tiles: WarrensRoomTile[] = Array.from({ length: 6 }, (_, index) => {
    const page = index + 1;
    const card = raw.cards.find((c) => c.faces.front.page === page);
    if (
      !card ||
      card.faces.front.file !== WARRENS_TILES_FRONT ||
      card.id !== `dungeon_tile:warrens:p${String(page).padStart(3, "0")}`
    )
      throw new Error(`Warrens 板块 p${page} 来源或 ID 不一致`);
    const back = card.faces.back;
    if (back?.file !== WARRENS_TILES_BACK || back.page !== page)
      throw new Error(`Warrens 板块 p${page} 背面来源或页码不一致`);
    const label = printLabel(raw, page);
    if (label !== PRINT_LABELS[index])
      throw new Error(
        `Warrens 板块 p${page} 印刷编号 ${label} 与核准 ${PRINT_LABELS[index]} 不一致`,
      );
    return {
      id: `room_tile:warrens:${String(page).padStart(2, "0")}`,
      rawId: `dungeon_tile:warrens:p${String(page).padStart(3, "0")}`,
      roomId: `room:warrens:${String(page).padStart(2, "0")}`,
      location: "warrens" as const,
      number: page,
      name: roomNames[index] ?? `Warrens room ${page}`,
      printLabel: label,
      source: {
        file: WARRENS_TILES_FRONT,
        page,
        face: "front" as const,
        back: WARRENS_TILES_BACK,
      },
      geometryVerified: false as const,
      usable: false as const,
      pendingReview: [PENDING_GEOMETRY],
    };
  });
  return warrensRoomTileCatalogSchema.parse({
    schema: "ddbg-warrens-room-tile-catalog-v0",
    tiles,
  });
}
