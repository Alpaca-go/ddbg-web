import { describe, expect, it } from "vitest";
import type { GameState } from "@ddbg/engine";
import { resolveBattleRoomTileId } from "./resolve-battle-room-tile-id";

function gameWithTile(tileId?: string): GameState {
  return {
    dungeon: {
      roomCards: {
        active: tileId ? { cardId: "room:p003", tileId } : { cardId: "room:p003" },
      },
    },
  } as GameState;
}

describe("resolveBattleRoomTileId", () => {
  it("prefers dungeon active tileId", () => {
    expect(resolveBattleRoomTileId(gameWithTile("room_tile:p002:front"), "Healing Fountain")).toBe(
      "room_tile:p002:front",
    );
  });

  it("falls back to room name in geometry catalog", () => {
    expect(resolveBattleRoomTileId({} as GameState, "Beacon of Light")).toBe(
      "room_tile:p003:front",
    );
  });

  it("maps battle sandbox default tile name to ritual chamber", () => {
    expect(resolveBattleRoomTileId({} as GameState, "Ritual Chamber")).toBe("room_tile:p001");
  });
});
