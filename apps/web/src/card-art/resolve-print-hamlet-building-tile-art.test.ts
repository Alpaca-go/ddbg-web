import { describe, expect, it } from "vitest";
import printMap from "./hamlet-building-tile-print-art-map.json";
import {
  HAMLET_BUILDING_TILE_MANUAL_DIR,
  cachedPrintHamletBuildingTileUrl,
  hamletBuildingTileArtMapMeta,
  listHamletBuildingTileArt,
  lookupHamletBuildingTileArt,
  manualHamletBuildingTilePngRel,
  resolveHamletBuildingTileArt,
} from "./resolve-print-hamlet-building-tile-art";

const UPGRADABLE = [
  "abbey",
  "tavern",
  "sanitarium",
  "survivalist",
  "stagecoach",
  "blacksmith",
  "nomadWagon",
] as const;

describe("print hamlet building tile art map", () => {
  it("maps fourteen II/III manual tiles", () => {
    const meta = hamletBuildingTileArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hamlet-building-tile-art-map.v1");
    expect(meta.tileCount).toBe(14);
    expect(meta.manualDir).toBe(HAMLET_BUILDING_TILE_MANUAL_DIR);
    expect(printMap.tiles).toHaveLength(14);

    for (const buildingId of UPGRADABLE) {
      for (const level of [2, 3] as const) {
        const tile = lookupHamletBuildingTileArt(buildingId, level);
        expect(tile).toBeDefined();
        expect(tile!.buildingId).toBe(buildingId);
        expect(tile!.level).toBe(level);
        expect(tile!.cropMethod).toBe("manual_kyries");
        expect(tile!.pngRel).toBe(manualHamletBuildingTilePngRel(buildingId, level));
        expect(cachedPrintHamletBuildingTileUrl(tile!)).toBe(`/print-card-art/${tile!.pngRel}`);
        const resolved = resolveHamletBuildingTileArt(buildingId, level);
        expect(resolved.kind).toBe("print");
        if (resolved.kind === "print") {
          expect(resolved.url).toBe(`/print-card-art/${tile!.pngRel}`);
        }
      }
    }

    expect(listHamletBuildingTileArt().length).toBe(14);
  });

  it("falls back when building tile is not mapped", () => {
    expect(resolveHamletBuildingTileArt("guild", 2)).toEqual({ kind: "missing" });
    expect(lookupHamletBuildingTileArt("guild", 2)).toBeUndefined();
  });
});
