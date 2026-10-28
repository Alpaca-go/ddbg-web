import artMap from "./corridor-tile-print-art-map.json";
import { PRINT_CARD_ART_PUBLIC_PREFIX } from "./resolve-exploration-art";

export type CorridorTileArtEntry = {
  readonly id: string;
  readonly rawId: string;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const byId = new Map<string, CorridorTileArtEntry>(
  (artMap.tiles as CorridorTileArtEntry[]).map((t) => [t.id, t]),
);
const byRawId = new Map<string, CorridorTileArtEntry>(
  (artMap.tiles as CorridorTileArtEntry[]).map((t) => [t.rawId, t]),
);

export function lookupCorridorTileArt(corridorTileId: string): CorridorTileArtEntry | undefined {
  return byId.get(corridorTileId) ?? byRawId.get(corridorTileId);
}

export function cachedCorridorTileArtUrl(entry: Pick<CorridorTileArtEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function corridorTilePrintArtMapMeta(): {
  readonly schema: string;
  readonly tileCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: artMap.schema,
    tileCount: artMap.tiles.length,
    pendingConfirmation: artMap.pendingConfirmation,
  };
}
