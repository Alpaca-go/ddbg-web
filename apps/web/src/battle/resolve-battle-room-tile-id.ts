import type { GameState } from "@ddbg/engine";
import roomTileGeometry from "../../../../packages/data/normalized/corebox/room_tile_geometry.json";

/** Matches battle-data-plugin sandbox (Ritual Chamber / room_tile:p001). */
const SANDBOX_DEFAULT_TILE_ID = "room_tile:p001";
const SANDBOX_DEFAULT_TILE_NAME = "Ritual Chamber";

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
  if (label === SANDBOX_DEFAULT_TILE_NAME) return SANDBOX_DEFAULT_TILE_ID;
  return undefined;
}
