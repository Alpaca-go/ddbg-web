import printMap from "./hamlet-building-tile-print-art-map.json";

export type HamletBuildingTileArtEntry = {
  readonly buildingId: string;
  readonly level: number;
  readonly printName?: string;
  readonly printLevel?: string;
  readonly pngRel: string;
  readonly primaryPdf: string;
  readonly printPage: number;
  readonly diecutPt: readonly number[];
  readonly cropMethod: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
  readonly textSnippet?: string;
};

const byKey = new Map<string, HamletBuildingTileArtEntry>(
  (printMap.tiles as HamletBuildingTileArtEntry[]).map((tile) => [
    `${tile.buildingId}:${tile.level}`,
    tile,
  ]),
);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

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

export function hamletBuildingTileArtMapMeta() {
  return {
    schema: printMap.schema,
    tileCount: (printMap.tiles as HamletBuildingTileArtEntry[]).length,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
