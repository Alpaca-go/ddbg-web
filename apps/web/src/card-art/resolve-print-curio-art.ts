import printMap from "./curio-print-art-map.json";

export type PrintCurioFaceEntry = {
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly cropMethod: string;
  readonly textSnippet: string;
};

export type PrintCurioArtCard = {
  readonly id: string;
  readonly name: string;
  readonly faces: {
    readonly front: PrintCurioFaceEntry;
    readonly back: PrintCurioFaceEntry;
  };
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const byId = new Map<string, PrintCurioArtCard>(
  (printMap.cards as PrintCurioArtCard[]).map((card) => [card.id, card]),
);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupPrintCurioFace(
  curioId: string,
  face: "front" | "back" = "front",
): (PrintCurioArtCard & { faceEntry: PrintCurioFaceEntry }) | undefined {
  const card = byId.get(curioId);
  if (!card) return undefined;
  return { ...card, faceEntry: card.faces[face] };
}

export function cachedPrintCurioUrl(entry: Pick<PrintCurioFaceEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printCurioArtMapMeta() {
  return {
    schema: printMap.schema,
    cardCount: printMap.cards.length,
    trimBoxPt: printMap.source.trimBoxPt,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
