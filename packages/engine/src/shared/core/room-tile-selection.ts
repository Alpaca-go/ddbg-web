import catalog from "../../../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../../../data/src/core/rooms/room-tile-selection.build";

/** 使用生产目录；玩家命令不能注入板块或把usable=false改为true。 */
export function readRoomTile(card: unknown, expectedTileId?: string) {
  return selectRoomTile(card, catalog, expectedTileId);
}
