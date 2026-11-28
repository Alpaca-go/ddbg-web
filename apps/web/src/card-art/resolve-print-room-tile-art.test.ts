import { describe, expect, it } from "vitest";
import geometry from "../../../../packages/data/normalized/corebox/room_tile_geometry.json";
import printMap from "./room-tile-print-art-map.json";
import {
  ROOM_TILE_FACE_MANUAL_DIR,
  cachedPrintRoomTileRelUrl,
  lookupRoomTileArt,
  manualRoomTileFacePngRel,
  resolveRoomTileFaceUrl,
  roomTileArtMapMeta,
} from "./resolve-print-room-tile-art";

describe("print room tile art map", () => {
  it("maps geometry-verified tiles to manual face cache paths", () => {
    const meta = roomTileArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-room-tile-art-map.v1");
    const verified = geometry.tiles.filter((tile) => tile.geometryVerified);
    const verifiedIds = new Set(verified.map((tile) => tile.id));
    const coreMapped = printMap.tiles.filter((tile) => verifiedIds.has(tile.tileId));
    expect(meta.tileCount).toBe(printMap.tiles.length);
    expect(meta.faceManualDir).toBe(ROOM_TILE_FACE_MANUAL_DIR);
    expect(
      coreMapped.map((tile) => [tile.tileId, tile.primaryPdf, tile.printPage, tile.face]),
    ).toEqual(
      verified.map((tile) => [tile.id, tile.source.file, tile.source.page, tile.source.face]),
    );
    const hall = lookupRoomTileArt("room_tile:darkest:02");
    expect(hall).toMatchObject({
      name: "Hall of Ascension",
      printPage: 9,
      primaryPdf: "DD_COREBOX_TILES_BACK.pdf",
      face: "back",
      facePngRel: "manual/room-tile-faces/room_tile-darkest-02.png",
    });

    const fountain = lookupRoomTileArt("room_tile:ruins:03");
    expect(fountain?.name).toBe("Healing Fountain");
    expect(fountain?.facePngRel).toBe("manual/room-tile-faces/room_tile-ruins-03.png");
    expect(resolveRoomTileFaceUrl("room_tile:ruins:03")).toBe(
      cachedPrintRoomTileRelUrl("manual/room-tile-faces/room_tile-ruins-03.png"),
    );
  });

  it("exposes face path convention when tile id is unknown to map", () => {
    expect(manualRoomTileFacePngRel("room_tile:weald:10")).toBe(
      "manual/room-tile-faces/room_tile-weald-10.png",
    );
    expect(resolveRoomTileFaceUrl(undefined)).toBeUndefined();
  });
});
