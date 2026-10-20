import { describe, expect, it } from "vitest";
import printMap from "./hamlet-building-tile-print-art-map.json";
import {
  cachedPrintHamletBuildingTileUrl,
  hamletBuildingTileArtMapMeta,
  listHamletBuildingTileArt,
  lookupHamletBuildingTileArt,
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
  it("maps fourteen II/III upgrade tiles", () => {
    const meta = hamletBuildingTileArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hamlet-building-tile-art-map.v1");
    expect(meta.tileCount).toBe(14);
    expect(printMap.tiles).toHaveLength(14);

    for (const buildingId of UPGRADABLE) {
      for (const level of [2, 3] as const) {
        const tile = lookupHamletBuildingTileArt(buildingId, level);
        expect(tile).toBeDefined();
        expect(tile!.buildingId).toBe(buildingId);
        expect(tile!.level).toBe(level);
        expect(tile!.diecutPt).toHaveLength(4);
        expect(tile!.matchMethod).toContain("bld_form_panel_bbox");
        expect(cachedPrintHamletBuildingTileUrl(tile!)).toBe(`/print-card-art/${tile!.pngRel}`);
      }
    }

    expect(listHamletBuildingTileArt().length).toBe(14);
  });
});
