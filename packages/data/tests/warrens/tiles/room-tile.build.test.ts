import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { warrensRoomTileCatalogSchema } from "../../../src/warrens/tiles/room-tile";
import {
  loadNormalizedWarrensRoomTiles,
  writeNormalizedWarrensRooms,
} from "../../../src/warrens/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWarrensRooms();

const built = loadNormalizedWarrensRoomTiles();

describe("Warrens 六张板块目录", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(
      warrensRoomTileCatalogSchema.parse(
        read("normalized/extension/warrens/room_tile_geometry.json"),
      ),
    ).toEqual(built);
  });

  it("登记印刷编号 1/3/5/7/9/11，几何未核准", () => {
    expect(built.tiles).toHaveLength(6);
    expect(built.tiles.map((t) => t.printLabel)).toEqual(["1", "3", "5", "7", "9", "11"]);
    for (const tile of built.tiles) {
      expect(cardContentPack(tile)).toBe("warrens");
      expect(tile.geometryVerified).toBe(false);
      expect(tile.usable).toBe(false);
    }
  });
});
