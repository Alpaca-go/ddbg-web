import printMap from "./monster-print-art-map.json";

export type PrintMonsterArtEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly category: string;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
  readonly reviewedAt?: string;
};

const byId = new Map<string, PrintMonsterArtEntry>(
  (printMap.cards as PrintMonsterArtEntry[]).map((card) => [card.id, card]),
);

/** Public URL path served by Vite from the gitignored print cache dir. */
export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupPrintMonsterFace(monsterCardId: string): PrintMonsterArtEntry | undefined {
  return byId.get(monsterCardId);
}

/** Local cache path under `.cache/print-card-art/` (e.g. `png/page_….png`). */
export function cachedPrintMonsterUrl(entry: Pick<PrintMonsterArtEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printMonsterArtMapMeta(): {
  readonly schema: string;
  readonly cardCount: number;
  readonly uncoveredEngineIds: readonly string[];
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: printMap.schema,
    cardCount: printMap.cards.length,
    uncoveredEngineIds: printMap.uncoveredEngineIds,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
