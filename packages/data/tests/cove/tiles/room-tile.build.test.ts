import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { roomCatalogSchema } from "../../../src/core/rooms/room";
import { wealdRoomTileGeometryFileSchema } from "../../../src/weald/tiles/room-tile";
import {
  COVE_TILES_BACK,
  COVE_TILES_FRONT,
  coveBossRoomTileCatalogSchema,
  coveNormalRoomTileCatalogSchema,
  coveRoomTileCatalogFileSchema,
} from "../../../src/cove/tiles/room-tile";
import { buildCoveRoomTiles } from "../../../src/cove/tiles/room-tile.build";
import { buildCoveRooms } from "../../../src/cove/rooms/room.build";
import {
  loadNormalizedCoveRoomTiles,
  loadNormalizedCoveRooms,
  writeNormalizedCoveRoomTiles,
} from "../../../src/cove/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveRoomTiles();

const built = loadNormalizedCoveRoomTiles();
const rooms = loadNormalizedCoveRooms();

describe("Cove 十二张板块印刷目录（R-048、包隔离）", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(
      coveRoomTileCatalogFileSchema.parse(read("normalized/extension/cove/room_tile_catalog.json")),
    ).toEqual(built);
  });

  it("FRONT/BACK 六页十二面均对照房间号", () => {
    expect(built.sources).toEqual({ front: COVE_TILES_FRONT, back: COVE_TILES_BACK });
    expect(built.tiles).toHaveLength(12);
    const verified = built.tiles.filter((tile) => tile.source.status === "verified");
    expect(verified).toHaveLength(12);
    expect(verified.map((tile) => [tile.number, tile.printedRoomNumber, tile.source])).toEqual([
      [1, 1, expect.objectContaining({ page: 1, face: "front", file: COVE_TILES_FRONT })],
      [2, 2, expect.objectContaining({ page: 1, face: "back", file: COVE_TILES_BACK })],
      [3, 3, expect.objectContaining({ page: 2, face: "front", file: COVE_TILES_FRONT })],
      [4, 4, expect.objectContaining({ page: 2, face: "back", file: COVE_TILES_BACK })],
      [5, 5, expect.objectContaining({ page: 3, face: "front", file: COVE_TILES_FRONT })],
      [6, 6, expect.objectContaining({ page: 3, face: "back", file: COVE_TILES_BACK })],
      [7, 7, expect.objectContaining({ page: 4, face: "front", file: COVE_TILES_FRONT })],
      [8, 8, expect.objectContaining({ page: 4, face: "back", file: COVE_TILES_BACK })],
      [9, 9, expect.objectContaining({ page: 5, face: "front", file: COVE_TILES_FRONT })],
      [10, 10, expect.objectContaining({ page: 5, face: "back", file: COVE_TILES_BACK })],
      [11, 11, expect.objectContaining({ page: 6, face: "front", file: COVE_TILES_FRONT })],
      [12, 12, expect.objectContaining({ page: 6, face: "back", file: COVE_TILES_BACK })],
    ]);
  });

  it("九张普通板块与三张 Boss 板块与房间目录对齐", () => {
    const normal = built.tiles.filter((tile) => !tile.boss);
    const boss = built.tiles.filter((tile) => tile.boss);
    expect(normal).toHaveLength(9);
    expect(boss).toHaveLength(3);
    for (const tile of built.tiles) {
      const room = rooms.cards.find((card) => card.id === tile.roomId)!;
      expect(room.name).toBe(tile.name);
      expect(Boolean(room.boss)).toBe(tile.boss);
    }
    expect(boss.map((tile) => tile.number)).toEqual([10, 11, 12]);
    for (const tile of boss) {
      expect(tile.poolEligible).toBe(false);
      expect(tile.classificationEvidence?.some((line) => line.includes("BOSS"))).toBe(true);
    }
  });

  it("全部 geometry/usability 保持停点；未接线", () => {
    for (const tile of built.tiles) {
      expect(tile.geometryVerified).toBe(false);
      expect(tile.geometryComplete).toBe(false);
      expect(tile.usable).toBe(false);
      expect(tile.runtimeReady).toBe(false);
      expect(tile.pendingReview.some((line) => line.includes("R-048"))).toBe(true);
    }
  });

  it("核心 / Weald 板块 schema 不接受 Cove 目录条目", () => {
    const sample = built.tiles[0]!;
    expect(
      wealdRoomTileGeometryFileSchema.safeParse({ schema: "x", category: "x", tiles: [sample] })
        .success,
    ).toBe(false);
    expect(roomCatalogSchema.safeParse([{ id: sample.roomId, name: sample.name }]).success).toBe(
      false,
    );
  });

  it("Cove 命名空间隔离", () => {
    for (const tile of built.tiles) {
      expect(cardContentPack({ id: tile.id })).toBe("cove");
      expect(cardContentPack({ id: tile.roomId })).toBe("cove");
    }
  });

  it("raw 漂移会失败", () => {
    const raw = rawFileSchema.parse(read("extract/extension/cove/raw/dungeon_tile.json"));
    const roomRaw = rawFileSchema.parse(read("extract/extension/cove/raw/room.json"));
    const roomsBuilt = buildCoveRooms(roomRaw).cards;
    expect(() =>
      buildCoveRoomTiles(
        {
          ...raw,
          cards: raw.cards.map((card) =>
            card.id === "dungeon_tile:cove:p001"
              ? {
                  ...card,
                  faces: {
                    ...card.faces,
                    front: {
                      ...card.faces.front,
                      spans: card.faces.front.spans.filter((span) => span.t !== "1"),
                    },
                  },
                }
              : card,
          ),
        },
        roomsBuilt,
      ),
    ).toThrow();
    expect(() =>
      buildCoveRoomTiles(
        {
          ...raw,
          sources: [{ ...raw.sources[0]!, back: null, back_pages: null }],
        },
        roomsBuilt,
      ),
    ).toThrow();
  });

  it("拒绝交换普通与 Boss 分类", () => {
    const shambler = built.tiles.find((tile) => tile.number === 11)!;
    expect(
      coveBossRoomTileCatalogSchema.safeParse({
        ...shambler,
        number: 2,
        boss: false,
        poolEligible: true,
      }).success,
    ).toBe(false);
    const flooded = built.tiles.find((tile) => tile.number === 2)!;
    expect(
      coveNormalRoomTileCatalogSchema.safeParse({ ...flooded, number: 11, boss: true }).success,
    ).toBe(false);
  });
});
