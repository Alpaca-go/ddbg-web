import printMap from "./player-aid-print-art-map.json";

export type PrintPlayerAidFaceEntry = {
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly cropMethod: string;
  readonly textSnippet: string;
};

export type PrintPlayerAidArtStatus = "enabled" | "art-only";

export type PrintPlayerAidArtCard = {
  readonly id: string;
  readonly name: string;
  readonly design: "provisions" | "rooms";
  readonly status: PrintPlayerAidArtStatus;
  readonly faces: {
    readonly front: PrintPlayerAidFaceEntry;
    readonly back: PrintPlayerAidFaceEntry;
  };
  readonly matchMethod: string;
  readonly reviewVerdict: string;
  readonly copiesOnPrint?: number;
};

export const PROVISION_PLAYER_AID_ID = "player_aid:p001";
export const ROOMS_PLAYER_AID_ID = "player_aid:p005";

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

const byId = new Map<string, PrintPlayerAidArtCard>(
  (printMap.cards as PrintPlayerAidArtCard[]).map((card) => [card.id, card]),
);

export function lookupPrintPlayerAidFace(
  playerAidId: string,
  face: "front" | "back" = "front",
): (PrintPlayerAidArtCard & { faceEntry: PrintPlayerAidFaceEntry }) | undefined {
  const card = byId.get(playerAidId);
  if (!card || card.status !== "enabled") return undefined;
  return { ...card, faceEntry: card.faces[face] };
}

export function lookupProvisionPlayerAidFront():
  (PrintPlayerAidArtCard & { faceEntry: PrintPlayerAidFaceEntry }) | undefined {
  return lookupPrintPlayerAidFace(PROVISION_PLAYER_AID_ID, "front");
}

export function lookupExplorationPlayerAidBack():
  (PrintPlayerAidArtCard & { faceEntry: PrintPlayerAidFaceEntry }) | undefined {
  return lookupPrintPlayerAidFace(PROVISION_PLAYER_AID_ID, "back");
}

export function lookupRoomsPlayerAidFront():
  (PrintPlayerAidArtCard & { faceEntry: PrintPlayerAidFaceEntry }) | undefined {
  return lookupPrintPlayerAidFace(ROOMS_PLAYER_AID_ID, "front");
}

export function lookupConditionsPlayerAidBack():
  (PrintPlayerAidArtCard & { faceEntry: PrintPlayerAidFaceEntry }) | undefined {
  return lookupPrintPlayerAidFace(ROOMS_PLAYER_AID_ID, "back");
}

export function cachedPrintPlayerAidUrl(entry: Pick<PrintPlayerAidFaceEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printPlayerAidArtMapMeta() {
  return {
    schema: printMap.schema,
    cardCount: printMap.cards.length,
    enabledIds: (printMap.cards as PrintPlayerAidArtCard[])
      .filter((c) => c.status === "enabled")
      .map((c) => c.id),
    trimBoxPt: printMap.source.trimBoxPt,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
