import { describe, expect, it } from "vitest";
import {
  lookupCorridorTile,
  readCorridorTileCatalog,
  resolveQuestMapEdgeCorridor,
} from "./corridor-tile-catalog";

describe("走廊段板块 catalog", () => {
  it("加载 p6–p14 共 9 张，均未 geometryVerified", () => {
    const file = readCorridorTileCatalog();
    expect(file.tiles).toHaveLength(9);
    expect(file.tiles.every((t) => !t.geometryVerified)).toBe(true);
    expect(lookupCorridorTile("corridor_tile:p006")?.ports.length).toBeGreaterThan(0);
    expect(lookupCorridorTile("corridor_tile:p007")?.ports).toEqual([]);
  });

  it("QuestMap 边绑定缺省为 pending，不猜 corridor_tile", () => {
    const binding = resolveQuestMapEdgeCorridor("quest_map:p001", "G", "D");
    expect(binding.status).toBe("pending");
    expect(binding.corridorTileId).toBeNull();
    expect(binding.note).toMatch(/未批/);
  });
});
