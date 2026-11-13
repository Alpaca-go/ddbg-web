import { describe, expect, it } from "vitest";
import { WEALD_APPROVED_ROOM_CARDS, WEALD_APPROVED_ROOM_TILES } from "./room-catalog";
import { selectWealdRoomTile } from "./room-tile-selection";

describe("selectWealdRoomTile", () => {
  it("按核准目录匹配 Weald 房间与板块", () => {
    const card = WEALD_APPROVED_ROOM_CARDS.find((c) => c.number === 3)!;
    const tile = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 3)!;
    expect(selectWealdRoomTile(card, tile.id)).toMatchObject({
      status: "matched",
      tile,
    });
  });

  it("板块 id 不一致时拒绝", () => {
    const card = WEALD_APPROVED_ROOM_CARDS.find((c) => c.number === 3)!;
    const other = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 1)!;
    expect(selectWealdRoomTile(card, other.id).status).toBe("refused");
  });

  it("核心房间身份不被接受", () => {
    expect(selectWealdRoomTile({ id: "room:p001", location: "ruins" }).status).toBe("refused");
  });
});
