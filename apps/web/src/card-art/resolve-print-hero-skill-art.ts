import printMap from "./hero-skill-print-art-map.json";

export type PrintHeroSkillArtEntry = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly hero: string;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const byId = new Map<string, PrintHeroSkillArtEntry>(
  (printMap.cards as PrintHeroSkillArtEntry[]).map((card) => [card.id, card]),
);

/** Public URL path served by Vite from the gitignored print cache dir. */
export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupPrintHeroSkillFace(skillId: string): PrintHeroSkillArtEntry | undefined {
  return byId.get(skillId);
}

/** Local cache path under `.cache/print-card-art/` (e.g. `png/page_….png`). */
export function cachedPrintHeroSkillUrl(entry: Pick<PrintHeroSkillArtEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printHeroSkillArtMapMeta(): {
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
