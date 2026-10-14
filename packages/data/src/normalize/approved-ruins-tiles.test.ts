import { expect, it } from "vitest";
import file from "../../normalized/corebox/room_tile_geometry.json";
import { roomTileGeometrySchema } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";
import rooms from "../../normalized/corebox/room.json";

it.each([[6, "back", 4, [2, 4, 3, 2, 4, 2, 2, 3, 3], 8, 0, 1]] as const)(
  "遗迹%i独立获批几何与完整特殊运行时锁定（R-065–067/073）",
  (number, face, page, capacities, passages, corners, blocked) => {
    const tile = file.tiles.find((t) => t.number === number)!;
    expect(tile.source).toEqual({ file: `DD_COREBOX_TILES_${face.toUpperCase()}.pdf`, face, page });
    expect(tile.areas.map((a) => a.capacity)).toEqual(capacities);
    expect(tile.edges.filter((e) => !e.blocked && !e.cornerOnly)).toHaveLength(passages);
    expect(tile.edges.filter((e) => e.cornerOnly)).toHaveLength(corners);
    expect(tile.edges.filter((e) => e.blocked)).toHaveLength(blocked);
    expect(tile.geometryVerified).toBe(true);
    expect(tile.deployment.printReview).toBe("verified");
    expect(tile.usable).toBe(true);
    expect(tile.specialRegions?.every((r) => r.status === "confirmed" && r.runtimeReady)).toBe(
      true,
    );
    expect(roomTileGeometrySchema.safeParse(tile).success).toBe(true);
    for (const changed of [
      { ...tile, usable: false },
      { ...tile, specialRegions: tile.specialRegions!.map((r) => ({ ...r, runtimeReady: false })) },
      {
        ...tile,
        areas: tile.areas.map((a, i) => (i === 0 ? { ...a, capacity: a.capacity + 1 } : a)),
      },
      {
        ...tile,
        deployment: {
          ...tile.deployment,
          heroes: { ...tile.deployment.heroes, aggressive: tile.areas[0]!.id },
        },
      },
      {
        ...tile,
        source: { ...tile.source, face: tile.source.face === "front" ? "back" : "front" },
      },
    ])
      expect(roomTileGeometrySchema.safeParse(changed).success).toBe(false);
    const selected = selectRoomTile(
      rooms.cards.find((c) => c.id === tile.roomId),
      file,
    );
    expect(selected.status).toBe("matched");
  },
);
it("Spiked最终十五通路、两墙、无角点；Treasure T4-T5为墙，均不补孤立区域的边（R-065/066）", () => {
  const spiked = file.tiles.find((t) => t.number === 4)!;
  expect(
    spiked.edges
      .filter((e) => e.blocked)
      .map((e) => `${e.from}-${e.to}`)
      .sort(),
  ).toEqual(["S1-S2", "S5-S7"]);
  expect(spiked.edges.some((e) => !e.blocked && (e.from === "S1" || e.to === "S1"))).toBe(false);
  expect(spiked.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual(["S1"]);
  const treasure = file.tiles.find((t) => t.number === 6)!;
  expect(treasure.edges.find((e) => e.from === "T4" && e.to === "T5")).toMatchObject({
    blocked: true,
    cornerOnly: false,
  });
  expect(treasure.edges.some((e) => !e.blocked && (e.from === "T4" || e.to === "T4"))).toBe(false);
});
it("所有九面几何已入库且可战；其他核心盒面未被批准", () => {
  expect(file.tiles).toHaveLength(9);
  expect(file.tiles.filter((t) => t.usable)).toHaveLength(9);
  expect(file.tiles.map((t) => t.number).sort((a, b) => a - b)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9,
  ]);
});
