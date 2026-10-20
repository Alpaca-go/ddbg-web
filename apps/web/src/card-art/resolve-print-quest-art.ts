import printMap from "./quest-print-art-map.json";

export type PrintQuestFaceEntry = {
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly cropMethod: string;
  readonly textSnippet: string;
};

export type PrintQuestArtStatus = "enabled" | "art-only";

export type PrintQuestArtCard = {
  readonly id: string;
  readonly name: string;
  readonly status: PrintQuestArtStatus;
  readonly faces: {
    readonly front: PrintQuestFaceEntry;
    readonly back: PrintQuestFaceEntry;
  };
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const byId = new Map<string, PrintQuestArtCard>(
  (printMap.cards as PrintQuestArtCard[]).map((card) => [card.id, card]),
);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupPrintQuestFace(
  questId: string,
  face: "front" | "back" = "front",
): (PrintQuestArtCard & { faceEntry: PrintQuestFaceEntry }) | undefined {
  const card = byId.get(questId);
  if (!card) return undefined;
  return { ...card, faceEntry: card.faces[face] };
}

export function cachedPrintQuestUrl(entry: Pick<PrintQuestFaceEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printQuestArtMapMeta() {
  return {
    schema: printMap.schema,
    cardCount: printMap.cards.length,
    enabledQuestIds: printMap.source.enabledQuestIds,
    artOnlyQuestIds: printMap.source.artOnlyQuestIds ?? [],
    trimBoxPt: printMap.source.trimBoxPt,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
