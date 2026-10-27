import printMap from "./room-tile-print-art-map.json";

export type RoomTileArtEntry = {
  readonly tileId: string;
  readonly name: string;
  readonly facePngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly face: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
  readonly areaIds: readonly string[];
};

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export const ROOM_TILE_FACE_MANUAL_DIR = "manual/room-tile-faces";

const byTileId = new Map<string, RoomTileArtEntry>(
  (printMap.tiles as RoomTileArtEntry[]).map((tile) => [tile.tileId, tile]),
);

export function sanitizeRoomTileIdForPath(tileId: string): string {
  return tileId.replace(/:/g, "-");
}

export function manualRoomTileFacePngRel(tileId: string): string {
  return `${ROOM_TILE_FACE_MANUAL_DIR}/${sanitizeRoomTileIdForPath(tileId)}.png`;
}

export function lookupRoomTileArt(tileId: string): RoomTileArtEntry | undefined {
  return byTileId.get(tileId);
}

export function cachedPrintRoomTileUrl(entry: Pick<RoomTileArtEntry, "facePngRel">): string {
  const rel = entry.facePngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function cachedPrintRoomTileRelUrl(pngRel: string): string {
  const rel = pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

/** Whole room-tile face URL for battle board underlay (no per-area crops). */
export function resolveRoomTileFaceUrl(tileId: string | undefined): string | undefined {
  if (!tileId) return undefined;
  const entry = lookupRoomTileArt(tileId);
  const faceRel = entry?.facePngRel ?? manualRoomTileFacePngRel(tileId);
  return cachedPrintRoomTileRelUrl(faceRel);
}

export function roomTileArtMapMeta() {
  return {
    schema: printMap.schema,
    tileCount: (printMap.tiles as RoomTileArtEntry[]).length,
    faceManualDir: ROOM_TILE_FACE_MANUAL_DIR,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
