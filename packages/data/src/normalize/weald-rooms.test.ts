import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { roomCatalogSchema } from "../room";
import {
  wealdRoomFileSchema,
  wealdRoomTileGeometryFileSchema,
  wealdRoomTileSchema,
} from "../weald-room";
import { cardContentPack } from "../content-packs";
import { assertWealdRoomsPackIsolated, buildWealdRooms } from "./weald-rooms";
import { loadNormalizedWealdRooms, writeNormalizedWealdRooms } from "./write-weald";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWealdRooms();

const { rooms: builtRooms, tiles: builtTiles } = loadNormalizedWealdRooms();

describe("Weald 普通房间与板块（R-234–R-238、包隔离）", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(wealdRoomFileSchema.parse(read("normalized/extension/weald/room.json"))).toEqual(
      builtRooms,
    );
    expect(
      wealdRoomTileGeometryFileSchema.parse(
        read("normalized/extension/weald/room_tile_geometry.json"),
      ),
    ).toEqual(builtTiles);
  });

  it("九张房间均属 weald 命名空间，核心目录不接纳", () => {
    for (const card of builtRooms.cards) {
      expect(cardContentPack(card)).toBe("weald");
      expect(card.boss).toBe(false);
    }
    expect(roomCatalogSchema.safeParse(builtRooms.cards).success).toBe(false);
  });

  it("2–6、8–9 号通路／角点计数与裁定一致；7 号仅部分通路", () => {
    const expectCounts = (number: number, passages: number, corners: number, complete: boolean) => {
      const tile = builtTiles.tiles.find((t) => t.number === number)!;
      expect(tile.edges.filter((e) => !e.blocked && !e.cornerOnly)).toHaveLength(passages);
      expect(tile.edges.filter((e) => e.cornerOnly)).toHaveLength(corners);
      expect(tile.geometryComplete).toBe(complete);
    };
    expectCounts(2, 10, 3, true);
    expectCounts(3, 12, 3, true);
    expectCounts(4, 10, 2, true);
    expectCounts(5, 12, 8, true);
    expectCounts(6, 9, 2, true);
    expectCounts(7, 4, 1, false);
    expectCounts(8, 11, 4, true);
    expectCounts(9, 6, 4, true);
  });

  it("1 号无通行边、无 Toxic 星标；7 号显式 Q-186", () => {
    const one = builtTiles.tiles.find((t) => t.number === 1)!;
    const seven = builtTiles.tiles.find((t) => t.number === 7)!;
    expect(one.edges).toHaveLength(0);
    expect(one.geometryComplete).toBe(false);
    expect(one.specialRegions).toHaveLength(0);
    expect(one.pendingReview).toContain("Q-186:toxic-mushroom-effect-area");
    expect(seven.pendingReview.join(",")).toMatch(/chasm/);
    expect(seven.edges.map((e) => `${e.from}-${e.to}`).sort()).toEqual(
      ["A-C", "A-D", "C-D", "E-F", "E-G"].sort(),
    );
  });

  it("5 号零容量 I 与真菌放置按 R-236", () => {
    const five = builtTiles.tiles.find((t) => t.number === 5)!;
    expect(five.zeroCapacityAreas).toEqual(["I"]);
    expect(five.areas.find((a) => a.id === "I")?.capacity).toBe(0);
    const three = builtTiles.tiles.find((t) => t.number === 3)!;
    expect(three.necroticFungusAreas).toEqual(["B", "G"]);
    const eight = builtTiles.tiles.find((t) => t.number === 8)!;
    expect(eight.necroticFungusAreas).toEqual(["C", "E"]);
  });

  it("未选 Weald 时核心 sources 不得误用当地房间", () => {
    assertWealdRoomsPackIsolated();
    for (const tile of builtTiles.tiles) {
      expect(cardContentPack({ id: tile.roomId })).toBe("weald");
      expect(tile.usable).toBe(false);
    }
  });

  it("篡改 7 号补边或 1 号通行图会被 schema 拒绝", () => {
    const seven = structuredClone(builtTiles.tiles.find((t) => t.number === 7)!);
    seven.edges.push({ from: "B", to: "C", cornerOnly: false, blocked: false });
    seven.geometryComplete = true;
    seven.pendingReview = [];
    expect(
      wealdRoomTileGeometryFileSchema.safeParse({ ...builtTiles, tiles: [seven] }).success,
    ).toBe(false);
    const one = structuredClone(builtTiles.tiles.find((t) => t.number === 1)!);
    one.edges.push({ from: "A", to: "B", cornerOnly: false, blocked: false });
    expect(wealdRoomTileSchema.safeParse(one).success).toBe(false);
  });
});

const raw = rawFileSchema.parse(read("extract/extension/weald/raw/room.json"));
expect(buildWealdRooms(raw).cards).toHaveLength(9);
