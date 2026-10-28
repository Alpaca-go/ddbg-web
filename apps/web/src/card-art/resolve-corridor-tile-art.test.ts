import { describe, expect, it } from "vitest";
import artMap from "./corridor-tile-print-art-map.json";
import {
  cachedCorridorTileArtUrl,
  corridorTilePrintArtMapMeta,
  lookupCorridorTileArt,
} from "./resolve-corridor-tile-art";

describe("corridor tile print art map", () => {
  it("covers TILES FRONT p6–p14", () => {
    const meta = corridorTilePrintArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-corridor-tile-art-map.v1");
    expect(meta.tileCount).toBe(9);
    expect(artMap.tiles.map((t) => t.printPage)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const hub = lookupCorridorTileArt("corridor_tile:p006");
    expect(hub?.pngRel).toContain("_p006.png");
    expect(cachedCorridorTileArtUrl(hub!)).toMatch(/^\/print-card-art\/png\//);
  });
});
