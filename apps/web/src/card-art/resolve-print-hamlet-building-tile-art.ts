import printMap from "./hamlet-building-tile-print-art-map.json";

export type HamletBuildingTileArtEntry = {
  readonly buildingId: string;
  readonly level: number;
  readonly pngRel: string;
  readonly cropMethod: string;
  readonly reviewVerdict: string;
};

export type HamletBuildingTileArtResolve =
  { kind: "print"; url: string; entry: HamletBuildingTileArtEntry } | { kind: "missing" };

const byKey = new Map<string, HamletBuildingTileArtEntry>(
  (printMap.tiles as HamletBuildingTileArtEntry[]).map((tile) => [
    `${tile.buildingId}:${tile.level}`,
    tile,
  ]),
);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export const HAMLET_BUILDING_TILE_MANUAL_DIR = "manual/hamlet-building-tiles";

export function manualHamletBuildingTilePngRel(buildingId: string, level: 2 | 3): string {
  const roman = level === 2 ? "ii" : "iii";
  return `${HAMLET_BUILDING_TILE_MANUAL_DIR}/${buildingId}-${roman}.png`;
}

export function lookupHamletBuildingTileArt(
  buildingId: string,
  level: 2 | 3,
): HamletBuildingTileArtEntry | undefined {
  return byKey.get(`${buildingId}:${level}`);
}

export function listHamletBuildingTileArt(): readonly HamletBuildingTileArtEntry[] {
  return printMap.tiles as HamletBuildingTileArtEntry[];
}

export function cachedPrintHamletBuildingTileUrl(
  entry: Pick<HamletBuildingTileArtEntry, "pngRel">,
): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

/**
 * Resolve manual building-tile art URL when mapped; otherwise missing (UI falls back to text).
 */
export function resolveHamletBuildingTileArt(
  buildingId: string,
  level: 2 | 3,
): HamletBuildingTileArtResolve {
  const entry = lookupHamletBuildingTileArt(buildingId, level);
  if (!entry) {
    return { kind: "missing" };
  }
  return {
    kind: "print",
    url: cachedPrintHamletBuildingTileUrl(entry),
    entry,
  };
}

export function hamletBuildingTileArtMapMeta() {
  return {
    schema: printMap.schema,
    tileCount: (printMap.tiles as HamletBuildingTileArtEntry[]).length,
    manualDir: HAMLET_BUILDING_TILE_MANUAL_DIR,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
