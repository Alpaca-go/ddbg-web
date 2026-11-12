import { describe, expect, it } from "vitest";
import coreRooms from "../../../../data/normalized/corebox/room.json";
import {
  findWealdRoomTile,
  wealdRoomCatalogForPacks,
  WEALD_APPROVED_ROOM_TILES,
} from "./room-catalog";

describe("Weald 房间目录包隔离", () => {
  it("未选 weald 包时目录为 null，核心房间不受影响", () => {
    expect(wealdRoomCatalogForPacks(["core"])).toBeNull();
    expect(coreRooms.cards.every((c: { id: string }) => !c.id.startsWith("room:weald:"))).toBe(
      true,
    );
  });

  it("选中 weald 时返回九张核准板块且均不可参战", () => {
    const catalog = wealdRoomCatalogForPacks(["core", "weald"]);
    expect(catalog?.rooms).toHaveLength(9);
    expect(catalog?.tiles).toHaveLength(9);
    expect(catalog?.tiles.every((t) => t.usable === false)).toBe(true);
    expect(findWealdRoomTile("room:weald:p007")?.geometryComplete).toBe(true);
    const one = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 1)!;
    expect(one.edges.filter((e) => !e.cornerOnly && !e.blocked)).toHaveLength(11);
  });
});
