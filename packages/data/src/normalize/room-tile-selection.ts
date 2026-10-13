import { roomCardSchema } from "../room";
import { roomTileGeometryFileSchema } from "./room-tile";

/** R16 / R-048：按房间身份匹配独立面；入库与可参战分别校验，不按PDF页码或名称兜底。 */
export function selectRoomTile(cardInput: unknown, catalogInput: unknown, expectedTileId?: string) {
  const card = roomCardSchema.safeParse(cardInput);
  const catalog = roomTileGeometryFileSchema.safeParse(catalogInput);
  const refused = (reason: string) => ({ status: "refused" as const, reason });
  if (!card.success || !catalog.success) return refused("房间身份或板块目录无效（R-048）");
  if (card.data.boss) return refused("Boss房间留对应阶段，不开放普通战斗入口");
  const matches = catalog.data.tiles.filter(
    (tile) =>
      tile.roomId === card.data.id &&
      tile.location === card.data.location &&
      tile.number === card.data.number,
  );
  if (matches.length !== 1) return refused("对应板块几何 / 部署尚未获批，保持已抽原牌（R-048）");
  const tile = matches[0]!;
  if (tile.name !== card.data.name || (expectedTileId !== undefined && tile.id !== expectedTileId))
    return refused("房间身份与已记录板块不一致，不替换已抽原牌（R-048）");
  if (
    !tile.geometryVerified ||
    tile.deployment?.printReview !== "verified" ||
    tile.unresolvedMarkers.length
  )
    return refused(`${tile.name} 已入库，但完整运行时尚未就绪或部署尚未获批；不可参战（R-048）`);
  if (
    !tile.usable ||
    ("specialRegions" in tile &&
      tile.specialRegions.some((r) => !r.runtimeReady || r.status !== "confirmed"))
  )
    return refused(`${tile.name} 已入库，但完整特殊运行时尚未就绪；不可参战（R-048）`);
  return { status: "matched" as const, tile, deployment: tile.deployment };
}
