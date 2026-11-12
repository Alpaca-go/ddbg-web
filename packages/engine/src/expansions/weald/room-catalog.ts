import {
  wealdRoomFileSchema,
  wealdRoomTileGeometryFileSchema,
  type WealdRoomCard,
  type WealdRoomTile,
} from "../../../../data/src/weald-room";
import rooms from "../../../../data/normalized/extension/weald/room.json";
import tiles from "../../../../data/normalized/extension/weald/room_tile_geometry.json";

const roomFile = wealdRoomFileSchema.parse(rooms);
const tileFile = wealdRoomTileGeometryFileSchema.parse(tiles);

export const WEALD_APPROVED_ROOM_CARDS: readonly WealdRoomCard[] = roomFile.cards;
export const WEALD_APPROVED_ROOM_TILES: readonly WealdRoomTile[] = tileFile.tiles;

/** 内容包未启用或出征未开放时不注入战役；此处仅提供核准目录读取。 */
export function findWealdRoomTile(roomId: string, tileId?: string): WealdRoomTile | undefined {
  const matches = WEALD_APPROVED_ROOM_TILES.filter((t) => t.roomId === roomId);
  if (matches.length !== 1) return undefined;
  const tile = matches[0]!;
  if (tileId !== undefined && tile.id !== tileId) return undefined;
  return tile;
}

export function wealdRoomCatalogForPacks(packs: readonly string[] | undefined) {
  if (packs !== undefined && !packs.includes("weald")) return null;
  return { rooms: WEALD_APPROVED_ROOM_CARDS, tiles: WEALD_APPROVED_ROOM_TILES };
}
