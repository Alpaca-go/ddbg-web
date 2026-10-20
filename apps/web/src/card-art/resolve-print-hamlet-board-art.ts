import printMap from "./hamlet-board-print-art-map.json";

export type HamletBoardArtEntry = {
  readonly id: string;
  readonly face: string;
  readonly pngRel: string;
  readonly primaryPdf: string;
  readonly printPage: number;
  readonly cropMethod: string;
  readonly textSnippet: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupHamletBoardArt(): HamletBoardArtEntry {
  return printMap.board as HamletBoardArtEntry;
}

export function cachedPrintHamletBoardUrl(entry: Pick<HamletBoardArtEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function hamletBoardArtMapMeta() {
  return {
    schema: printMap.schema,
    trimBoxPt: printMap.source.trimBoxPt,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
