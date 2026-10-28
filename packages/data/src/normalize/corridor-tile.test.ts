import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import {
  buildCorridorTileGeometry,
  corridorTileGeometryFileSchema,
  corridorTileSchema,
} from "./corridor-tile";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/dungeon_tile.json", import.meta.url), "utf8"),
  ),
);
describe("走廊段板块几何（dungeon_tile p6–p14）", () => {
  const file = buildCorridorTileGeometry(raw);

  it("生成 9 张 catalog，schema 与 raw 页码一致", () => {
    expect(file.schema).toBe("ddbg-corridor-tile-geometry-v0");
    expect(file.tiles).toHaveLength(9);
    expect(file.tiles.map((t) => t.source.page)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(file.tiles.every((t) => t.geometryVerified === false && t.review === "pending")).toBe(
      true,
    );
    corridorTileGeometryFileSchema.parse(file);
  });

  it("p006 多连接口 span；p007 仅板块编号、ports 为空", () => {
    const hub = file.tiles.find((t) => t.id === "corridor_tile:p006")!;
    expect(hub.sheetNumber).toBe(11);
    expect(hub.ports.map((p) => p.label).sort()).toEqual([
      "1-2",
      "10",
      "3",
      "4",
      "5",
      "6",
      "7-8",
      "9",
    ]);
    const straight = file.tiles.find((t) => t.id === "corridor_tile:p007")!;
    expect(straight.sheetNumber).toBe(13);
    expect(straight.ports).toEqual([]);
    expect(straight.pendingReasons.some((r) => r.includes("门洞编号"))).toBe(true);
  });

  it("拒绝重复生成或篡改 raw 页", () => {
    const dup = {
      ...raw,
      cards: [...raw.cards, raw.cards.find((c) => c.id === "dungeon_tile:p014")!],
    };
    expect(() => buildCorridorTileGeometry(dup)).toThrow();
  });

  it("单张 tile Zod 拒绝无 sheet 且无 ports", () => {
    expect(
      corridorTileSchema.safeParse({
        id: "corridor_tile:p099",
        rawId: "dungeon_tile:p099",
        sheetNumber: null,
        source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 6, face: "front" },
        review: "pending",
        geometryVerified: false,
        ports: [],
        segments: [],
        pendingReasons: ["test"],
      }).success,
    ).toBe(false);
  });
});
