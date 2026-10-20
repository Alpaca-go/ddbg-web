import printMap from "./trinket-print-art-map.json";

export type PrintTrinketFaceEntry = {
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly cropMethod: string;
  readonly textSnippet: string;
};

export type PrintTrinketArtCard = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly backLevel: number;
  readonly faces: {
    readonly front: PrintTrinketFaceEntry;
    readonly back: PrintTrinketFaceEntry;
  };
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const byId = new Map<string, PrintTrinketArtCard>(
  (printMap.cards as PrintTrinketArtCard[]).map((card) => [card.id, card]),
);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupPrintTrinketFace(
  trinketId: string,
  face: "front" | "back" = "front",
): (PrintTrinketArtCard & { faceEntry: PrintTrinketFaceEntry }) | undefined {
  const card = byId.get(trinketId);
  if (!card) return undefined;
  return { ...card, faceEntry: card.faces[face] };
}

export function cachedPrintTrinketUrl(entry: Pick<PrintTrinketFaceEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printTrinketArtMapMeta() {
  return {
    schema: printMap.schema,
    cardCount: printMap.cards.length,
    trimBoxPt: printMap.source.trimBoxPt,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
