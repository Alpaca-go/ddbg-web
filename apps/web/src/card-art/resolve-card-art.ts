/** Public URL path served by Vite from the gitignored TTS cache dir. */
export const CARD_ART_CACHE_PUBLIC_PREFIX = "/tts-card-art";

export type AtlasFaceEntry = {
  readonly faceUrl: string;
  readonly backUrl?: string | null;
  readonly numWidth: number;
  readonly numHeight: number;
  readonly deckId: string;
  readonly cell: number;
};

/** Local cache filename for a deck face sheet (png preferred; jpg fallback in resolver). */
export function faceCacheBaseName(deckId: string): string {
  return `face-${deckId}`;
}

/**
 * Resolve a cached atlas URL for exploration / room deck sheets.
 * Prefer png then jpg; callers should treat load errors as missing cache.
 */
export function cachedFaceSheetUrl(
  entry: Pick<AtlasFaceEntry, "deckId">,
  ext: "png" | "jpg" = "png",
): string {
  return `${CARD_ART_CACHE_PUBLIC_PREFIX}/${faceCacheBaseName(entry.deckId)}.${ext}`;
}

export function atlasBackgroundPosition(entry: AtlasFaceEntry): string {
  const col = entry.cell % entry.numWidth;
  const row = Math.floor(entry.cell / entry.numWidth);
  const x = entry.numWidth === 1 ? 0 : (col / (entry.numWidth - 1)) * 100;
  const y = entry.numHeight === 1 ? 0 : (row / (entry.numHeight - 1)) * 100;
  return `${x}% ${y}%`;
}

export function atlasBackgroundSize(entry: AtlasFaceEntry): string {
  return `${entry.numWidth * 100}% ${entry.numHeight * 100}%`;
}
