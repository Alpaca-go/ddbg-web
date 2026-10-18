import faceMap from "./hero-skill-face-map.json";

export type CardArtEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly hero: string;
  readonly faceUrl: string;
  readonly backUrl: string | null;
  readonly numWidth: number;
  readonly numHeight: number;
  readonly deckId: string;
  readonly cell: number;
  readonly ttsCardId: number;
  readonly cellSource: string;
};

const byId = new Map<string, CardArtEntry>(
  (faceMap.cards as CardArtEntry[]).map((card) => [card.id, card]),
);

/** Public URL path served by Vite from the gitignored cache dir. */
export const CARD_ART_CACHE_PUBLIC_PREFIX = "/tts-card-art";

export function lookupHeroSkillFace(skillId: string): CardArtEntry | undefined {
  return byId.get(skillId);
}

/** Local cache filename for a deck face sheet (png preferred; jpg fallback in resolver). */
export function faceCacheBaseName(deckId: string): string {
  return `face-${deckId}`;
}

/**
 * Resolve a cached atlas URL for a mapped skill.
 * Prefer png then jpg; callers should treat load errors as missing cache.
 */
export function cachedFaceSheetUrl(entry: CardArtEntry, ext: "png" | "jpg" = "png"): string {
  return `${CARD_ART_CACHE_PUBLIC_PREFIX}/${faceCacheBaseName(entry.deckId)}.${ext}`;
}

export function atlasBackgroundPosition(entry: CardArtEntry): string {
  const col = entry.cell % entry.numWidth;
  const row = Math.floor(entry.cell / entry.numWidth);
  const x = entry.numWidth === 1 ? 0 : (col / (entry.numWidth - 1)) * 100;
  const y = entry.numHeight === 1 ? 0 : (row / (entry.numHeight - 1)) * 100;
  return `${x}% ${y}%`;
}

export function atlasBackgroundSize(entry: CardArtEntry): string {
  return `${entry.numWidth * 100}% ${entry.numHeight * 100}%`;
}

export function heroSkillFaceMapMeta(): {
  readonly schema: string;
  readonly cardCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: faceMap.schema,
    cardCount: faceMap.cards.length,
    pendingConfirmation: faceMap.pendingConfirmation,
  };
}
