import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { roomCatalogSchema } from "../../../src/core/rooms/room";
import {
  wealdRoomFileSchema,
  wealdRoomTileGeometryFileSchema,
  wealdRoomTileSchema,
} from "../../../src/weald/rooms/weald-room";
import { cardContentPack } from "../../../src/shared/content-packs";
import {
  assertWealdRoomsPackIsolated,
  buildWealdRooms,
} from "../../../src/weald/rooms/weald-rooms.build";
import {
  loadNormalizedWealdRooms,
  writeNormalizedWealdRooms,
} from "../../../src/shared/write-weald";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWealdRooms();

const { rooms: builtRooms, tiles: builtTiles } = loadNormalizedWealdRooms();

describe("Weald 普通房间与板块（R-234–R-239、包隔离）", () => {
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

  it("Precious 仅核准 Stash D 区标记可运行，不开放其他房间", () => {
    const four = builtTiles.tiles.find((t) => t.number === 4)!;
    expect(four.specialRegions).toMatchObject([
      { areaId: "D", effect: "precious", runtimeReady: true },
    ]);
    expect(
      wealdRoomTileSchema.safeParse({ ...four, number: 3, roomId: "room:weald:03" }).success,
    ).toBe(false);
    expect(
      wealdRoomTileSchema.safeParse({
        ...four,
        specialRegions: four.specialRegions.map((r) => ({ ...r, effect: "clearing" })),
      }).success,
    ).toBe(false);
  });
  it("九张普通房间均属 weald 命名空间，核心目录不接纳", () => {
    const normal = builtRooms.cards.filter((card) => !card.boss);
    expect(normal).toHaveLength(9);
    for (const card of normal) {
      expect(cardContentPack(card)).toBe("weald");
      expect(card.pendingReview).toEqual([]);
    }
    expect(roomCatalogSchema.safeParse(normal).success).toBe(false);
  });

  it("三张 Boss 房是 room 卡，poolEligible=false，不进入普通房间牌堆", () => {
    const boss = builtRooms.cards.filter((card) => card.boss);
    expect(boss.map((card) => [card.number, card.name])).toEqual([
      [10, "Hag"],
      [11, "Shrieker"],
      [12, "Brigand Pounder"],
    ]);
    for (const card of boss) {
      expect(card.poolEligible).toBe(false);
      expect(cardContentPack(card)).toBe("weald");
      expect(card.classificationEvidence.some((line) => line.includes("BOSS"))).toBe(true);
    }
    const normalIds = new Set(builtRooms.cards.filter((card) => !card.boss).map((card) => card.id));
    for (const card of boss) expect(normalIds.has(card.id)).toBe(false);
  });

  it("1–9 号通路／角点计数与裁定一致", () => {
    const expectCounts = (number: number, passages: number, corners: number, complete: boolean) => {
      const tile = builtTiles.tiles.find((t) => t.number === number)!;
      expect(tile.edges.filter((e) => !e.blocked && !e.cornerOnly)).toHaveLength(passages);
      expect(tile.edges.filter((e) => e.cornerOnly)).toHaveLength(corners);
      expect(tile.geometryComplete).toBe(complete);
    };
    expectCounts(1, 11, 2, true);
    expectCounts(2, 10, 3, true);
    expectCounts(3, 12, 3, true);
    expectCounts(4, 10, 2, true);
    expectCounts(5, 12, 8, true);
    expectCounts(6, 9, 2, true);
    expectCounts(7, 15, 4, true);
    expectCounts(8, 11, 4, true);
    expectCounts(9, 6, 4, true);
  });

  it("1 号 Toxic 绑定 C/E/F/G；7 号零容量 H/I/J 且无 D–G", () => {
    const one = builtTiles.tiles.find((t) => t.number === 1)!;
    const seven = builtTiles.tiles.find((t) => t.number === 7)!;
    expect(one.geometryComplete).toBe(true);
    expect(one.pendingReview).toHaveLength(0);
    const toxicAreas = one.specialRegions
      .filter((r) => r.effect === "toxicMushrooms")
      .map((r) => r.areaId)
      .sort();
    expect(toxicAreas).toEqual(["C", "E", "F", "G"]);
    expect(one.specialRegions.every((r) => r.runtimeReady)).toBe(true);
    expect(
      wealdRoomTileSchema.safeParse({ ...one, roomId: "room:weald:02", number: 2 }).success,
    ).toBe(false);
    expect(
      wealdRoomTileSchema.safeParse({
        ...one,
        specialRegions: one.specialRegions.map((r) => ({ ...r, effect: "precious" })),
      }).success,
    ).toBe(false);
    expect(seven.zeroCapacityAreas).toEqual(["H", "I", "J"]);
    for (const id of ["H", "I", "J"]) {
      expect(seven.areas.find((a) => a.id === id)?.capacity).toBe(0);
    }
    expect(seven.pendingReview).toHaveLength(0);
    const hasDG = seven.edges.some(
      (e) =>
        !e.cornerOnly &&
        !e.blocked &&
        ((e.from === "D" && e.to === "G") || (e.from === "G" && e.to === "D")),
    );
    expect(hasDG).toBe(false);
    const room1 = builtRooms.cards.find((c) => c.number === 1)!;
    expect(room1.verifiedEffect?.effectAreaBinding).toBe("confirmed");
    expect(room1.verifiedEffect?.ruling).toBe("R-239");
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

  it("7 号完整几何不得写入 D–G 直连", () => {
    const seven = structuredClone(builtTiles.tiles.find((t) => t.number === 7)!);
    seven.edges.push({ from: "D", to: "G", cornerOnly: false, blocked: false });
    expect(wealdRoomTileSchema.safeParse(seven).success).toBe(false);
  });
});

const raw = rawFileSchema.parse(read("extract/extension/weald/raw/room.json"));
expect(buildWealdRooms(raw).cards).toHaveLength(12);
