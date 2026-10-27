import { describe, expect, it } from "vitest";
import printMap from "./room-tile-print-art-map.json";
import {
  ROOM_TILE_AREA_MANUAL_DIR,
  ROOM_TILE_FACE_MANUAL_DIR,
  cachedPrintRoomTileRelUrl,
  lookupRoomTileArt,
  manualRoomTileAreaPngRel,
  manualRoomTileFacePngRel,
  resolveRoomTileAreaArtSources,
  roomTileArtMapMeta,
} from "./resolve-print-room-tile-art";

describe("print room tile art map", () => {
  it("maps geometry-verified tiles to manual cache paths", () => {
    const meta = roomTileArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-room-tile-art-map.v1");
    expect(meta.tileCount).toBe(9);
    expect(meta.faceManualDir).toBe(ROOM_TILE_FACE_MANUAL_DIR);
    expect(meta.areaManualDir).toBe(ROOM_TILE_AREA_MANUAL_DIR);
    expect(printMap.tiles).toHaveLength(9);

    const fountain = lookupRoomTileArt("room_tile:p002:front");
    expect(fountain?.name).toBe("Healing Fountain");
    expect(fountain?.facePngRel).toBe("manual/room-tile-faces/room_tile-p002-front.png");
    expect(manualRoomTileAreaPngRel("room_tile:p002:front", "G")).toBe(
      "manual/room-tile-areas/room_tile-p002-front/G.png",
    );

    const sources = resolveRoomTileAreaArtSources("room_tile:p002:front", "A");
    expect(sources.areaUrl).toBe(
      cachedPrintRoomTileRelUrl("manual/room-tile-areas/room_tile-p002-front/A.png"),
    );
    expect(sources.faceUrl).toBe(
      cachedPrintRoomTileRelUrl("manual/room-tile-faces/room_tile-p002-front.png"),
    );
  });

  it("exposes face path convention when tile id is unknown to map", () => {
    expect(manualRoomTileFacePngRel("room_tile:p099:front")).toBe(
      "manual/room-tile-faces/room_tile-p099-front.png",
    );
    expect(resolveRoomTileAreaArtSources(undefined, "B")).toEqual({});
  });
});
