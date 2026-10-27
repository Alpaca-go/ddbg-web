import type { GameState } from "@ddbg/engine";
import roomTileGeometry from "../../../../packages/data/normalized/corebox/room_tile_geometry.json";
import { battleData } from "virtual:battle-data";

type GeometryTile = { readonly id: string; readonly name: string };

const tilesByName = new Map<string, string>(
  (roomTileGeometry.tiles as GeometryTile[]).map((t) => [t.name, t.id]),
);

/** Dungeon battles use active roomCards.tileId; sandboxes fall back to room / tile name. */
export function resolveBattleRoomTileId(
  game: GameState,
  roomName: string | undefined,
): string | undefined {
  const fromDungeon = game.dungeon?.roomCards?.active?.tileId;
  if (fromDungeon) return fromDungeon;
  const label = roomName?.trim();
  if (label && tilesByName.has(label)) return tilesByName.get(label);
  if (label === battleData.tileName) return "room_tile:p001";
  return undefined;
}
