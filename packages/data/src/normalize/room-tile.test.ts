import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { buildRoomTileGeometry, roomTileGeometrySchema } from "./room-tile";
import { loadNormalizedCorebox } from "./write";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/dungeon_tile.json", import.meta.url), "utf8"),
  ),
);

describe("获批 Ritual Chamber 几何（R-054）", () => {
  it("只输出获批 FRONT 页，独立预期锁住容量、高台与最终邻接图", () => {
    const before = structuredClone(raw);
    const file = buildRoomTileGeometry(raw);
    expect(raw).toEqual(before);
    expect(file.tiles).toHaveLength(1);
    const tile = file.tiles[0]!;
    expect(tile.id).toBe("room_tile:p001");
    expect(tile.areas.map((area) => [area.id, area.capacity])).toEqual([
      ["A", 4],
      ["B", 3],
      ["C", 3],
      ["D", 3],
      ["E", 3],
      ["F", 2],
      ["G", 3],
      ["H", 2],
      ["I", 3],
      ["J", 2],
    ]);
    expect(tile.areas.filter((area) => area.elevation !== "normal")).toEqual([
      { id: "F", capacity: 2, elevation: "high" },
    ]);
    const adjacent = tile.edges.filter((edge) => !edge.blocked && !edge.cornerOnly);
    expect(adjacent.map((edge) => `${edge.from}-${edge.to}`).sort()).toEqual([
      "A-B",
      "A-D",
      "A-E",
      "B-C",
      "C-E",
      "C-G",
      "D-E",
      "D-H",
      "G-J",
      "H-I",
      "I-J",
    ]);
    expect(adjacent.some((edge) => edge.from === "F" || edge.to === "F")).toBe(false);
    expect(tile.edges.find((edge) => edge.from === "E" && edge.to === "F")).toEqual({
      from: "E",
      to: "F",
      blocked: true,
      cornerOnly: false,
    });
    expect(
      tile.edges
        .filter((edge) => edge.cornerOnly)
        .map((edge) => `${edge.from}-${edge.to}`)
        .sort(),
    ).toEqual(["D-I", "E-G", "G-I"]);
    expect(tile.geometryVerified).toBe(true);
    expect(tile.usable).toBe(true);
    expect(tile.unresolvedMarkers).toEqual([]);
    expect(tile.deployment).toMatchObject({
      printReview: "verified",
      heroes: { aggressive: "H", ranged: "H", defensive: "C", support: "C" },
      monsters: { aggressive: "J", defensive: "D", ranged: "F", support: "D" },
      lootAreas: ["C", "H"],
    });
    expect(tile.deployment!.markers.every((marker) => marker.status === "confirmed")).toBe(true);
  });

  it("生成可重现，与入库文件一致，其他六类卡牌不变", () => {
    const first = loadNormalizedCorebox();
    expect(loadNormalizedCorebox()).toEqual(first);
    for (const [name, file] of Object.entries(first)) {
      const committed = JSON.parse(
        readFileSync(new URL(`../../normalized/corebox/${name}.json`, import.meta.url), "utf8"),
      );
      expect(file).toEqual(committed);
    }
  });

  it("缺失 / 重复 / 漂移来源以及未确认标记缺失时拒绝，不能另猜一个板块", () => {
    for (const change of [
      (copy: typeof raw) => {
        copy.cards = copy.cards.filter((card) => card.id !== "dungeon_tile:p001");
      },
      (copy: typeof raw) => {
        copy.cards.push(structuredClone(copy.cards[0]!));
      },
      (copy: typeof raw) => {
        copy.cards[0]!.faces.front.page = 2;
      },
      (copy: typeof raw) => {
        copy.cards[0]!.faces.front.file = "other.pdf";
      },
      (copy: typeof raw) => {
        copy.cards[0]!.faces.front.spans = [];
      },
      (copy: typeof raw) => {
        copy.cards[0]!.faces.front.icons = [];
      },
    ]) {
      const copy = structuredClone(raw);
      change(copy);
      expect(() => buildRoomTileGeometry(copy)).toThrow();
    }
  });

  it("拒绝容量缺失 / 脏值、重复区域、坏边和绕过未验证标记", () => {
    const tile = buildRoomTileGeometry(raw).tiles[0]!;
    for (const capacity of [undefined, null, -1, 1.5, "3"])
      expect(
        roomTileGeometrySchema.safeParse({ ...tile, areas: [{ ...tile.areas[0], capacity }] })
          .success,
      ).toBe(false);
    for (const edge of [
      { from: "A", to: "unknown", blocked: false, cornerOnly: false },
      { from: "A", to: "A", blocked: false, cornerOnly: false },
      { from: "B", to: "A", blocked: false, cornerOnly: false },
    ])
      expect(
        roomTileGeometrySchema.safeParse({ ...tile, edges: [...tile.edges, edge] }).success,
      ).toBe(false);
    expect(
      roomTileGeometrySchema.safeParse({ ...tile, areas: [...tile.areas, tile.areas[0]] }).success,
    ).toBe(false);
    expect(roomTileGeometrySchema.safeParse({ ...tile, usable: false }).success).toBe(false);
    expect(
      roomTileGeometrySchema.safeParse({
        ...tile,
        deployment: { ...tile.deployment, printReview: "pending" },
      }).success,
    ).toBe(false);
    expect(
      roomTileGeometrySchema.safeParse({
        ...tile,
        deployment: {
          ...tile.deployment,
          markers: tile.deployment!.markers.map((marker) => ({ ...marker, areaId: "A" })),
        },
      }).success,
    ).toBe(false);
    expect(
      roomTileGeometrySchema.safeParse({
        ...tile,
        unresolvedMarkers: [{ areaId: "C", iconId: "4591aebebd", semantic: "guessed" }],
      }).success,
    ).toBe(false);
  });
});
