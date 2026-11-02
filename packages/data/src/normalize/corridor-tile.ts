import { z } from "zod";
import type { RawFile } from "../extract/raw";

/** 走廊段连接口编号来自印刷 span 文字，不自造含义（R-048 / Q-45）。 */
const portLabelPattern = /^\d{1,2}(-\d{1,2})?$/;

export const corridorPortSchema = z.strictObject({
  label: z.string().min(1),
  /** TrimBox 毫米坐标，span bbox 中心；仅定位，不是区域 polygon。 */
  x: z.number(),
  y: z.number(),
});

export const corridorTileSchema = z
  .strictObject({
    id: z.string().min(1),
    rawId: z.string().min(1),
    /** 板块右上印刷编号（若有）；与连接口 label 分开。 */
    sheetNumber: z.int().positive().nullable(),
    source: z.strictObject({
      file: z.literal("DD_COREBOX_TILES_FRONT.pdf"),
      page: z.int().min(6).max(14),
      face: z.literal("front"),
    }),
    review: z.enum(["pending", "confirmed"]),
    geometryVerified: z.literal(false),
    ports: z.array(corridorPortSchema),
    /** 段内邻接 / 灰点 / 容量：无 Kyries 批准表，保持空。 */
    segments: z.array(z.never()).length(0),
    pendingReasons: z.array(z.string().min(1)).min(1),
  })
  .superRefine((tile, ctx) => {
    if (tile.ports.length === 0 && tile.sheetNumber == null) {
      ctx.addIssue({ code: "custom", message: "须至少有 sheetNumber 或一个连接口 span" });
    }
  });

export const corridorTileGeometryFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-corridor-tile-geometry-v0"),
    category: z.literal("corridor_tile_geometry"),
    tiles: z.array(corridorTileSchema).length(9),
  })
  .superRefine((file, ctx) => {
    const ids = new Set(file.tiles.map((t) => t.id));
    const rawPages = new Set(file.tiles.map((t) => t.rawId));
    if (ids.size !== file.tiles.length || rawPages.size !== file.tiles.length) {
      ctx.addIssue({ code: "custom", message: "走廊板块 ID / raw 重复" });
    }
    const pages = file.tiles.map((t) => t.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "6,7,8,9,10,11,12,13,14") {
      ctx.addIssue({ code: "custom", message: "须覆盖 TILES FRONT p6–p14 共 9 张" });
    }
  });

export type CorridorTileGeometryFile = z.infer<typeof corridorTileGeometryFileSchema>;

function spanCentroid(bbox: readonly number[]) {
  return { x: (bbox[0]! + bbox[2]!) / 2, y: (bbox[1]! + bbox[3]!) / 2 };
}

function isSheetNumberSpan(span: { t: string; bbox: number[] }) {
  return (
    portLabelPattern.test(span.t) &&
    !span.t.includes("-") &&
    span.bbox[0]! > 250 &&
    span.bbox[1]! < 20
  );
}

function extractCorridorTile(card: RawFile["cards"][number]) {
  const face = card.faces.front;
  if (!face || face.file !== "DD_COREBOX_TILES_FRONT.pdf") {
    throw new Error(`${card.id}：缺少 FRONT 面`);
  }
  const page = card.pages[0];
  if (page == null || page < 6 || page > 14) {
    throw new Error(`${card.id}：不在走廊段 p6–p14 范围`);
  }
  const numericSpans = face.spans.filter((s) => portLabelPattern.test(s.t));
  const sheetSpan = numericSpans.find(isSheetNumberSpan);
  const sheetNumber = sheetSpan ? Number(sheetSpan.t) : null;
  const ports = numericSpans
    .filter((s) => s !== sheetSpan)
    .map((s) => ({ label: s.t, ...spanCentroid(s.bbox) }));
  const portLabels = new Set(ports.map((p) => p.label));
  if (portLabels.size !== ports.length) {
    throw new Error(`${card.id}：连接口 label 重复`);
  }
  const pendingReasons = [
    "段内通道 / 灰点 / 容量未批（Q-45 / R-046）；已入库项仅为 span 可证的连接口编号与 bbox 中心",
    "QuestMap 边 ↔ 本板块实例映射未批；引擎探索仍用抽象边",
  ];
  if (ports.length === 0) {
    pendingReasons.push(
      "本面 span 仅有右上板块编号、无 body 连接口数字；门洞编号待 Kyries 目视 / 标注（R-048）",
    );
  }
  return corridorTileSchema.parse({
    id: `corridor_tile:p${String(page).padStart(3, "0")}`,
    rawId: card.id,
    sheetNumber,
    source: { file: "DD_COREBOX_TILES_FRONT.pdf", page, face: "front" as const },
    review: "pending" as const,
    geometryVerified: false as const,
    ports,
    segments: [],
    pendingReasons,
  });
}

/** raw `dungeon_tile:p006`–`p014` → 走廊段几何 catalog；不输出 Room Tile 战斗面。 */
export function buildCorridorTileGeometry(raw: RawFile): CorridorTileGeometryFile {
  if (raw.category !== "dungeon_tile" || raw.kind !== "sheet") {
    throw new Error("走廊段几何只接受 dungeon_tile sheet raw");
  }
  const corridorCards = raw.cards
    .filter((c) => c.pages.length === 1 && c.pages[0]! >= 6 && c.pages[0]! <= 14)
    .sort((a, b) => a.pages[0]! - b.pages[0]!);
  if (corridorCards.length !== 9) {
    throw new Error(`期望 9 张走廊段 raw 卡，得到 ${corridorCards.length}`);
  }
  for (const card of corridorCards) {
    if (card.source_set !== "base" || card.copies !== 1) {
      throw new Error(`${card.id}：来源 / 份数漂移`);
    }
  }
  const tiles = corridorCards.map(extractCorridorTile);
  return corridorTileGeometryFileSchema.parse({
    schema: "ddbg-corridor-tile-geometry-v0",
    category: "corridor_tile_geometry",
    tiles,
  });
}
