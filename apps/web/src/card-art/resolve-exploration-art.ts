import printMap from "./exploration-print-art-map.json";
import roomTokenPrintMap from "./room-token-print-art-map.json";

export type PrintExplorationArtEntry = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
  readonly boss?: boolean;
};

export type QuestMapArtEntry = PrintExplorationArtEntry & {
  readonly category: "quest_map";
  /** Alias for layout wiring (`dungeon_layouts` source.page). */
  readonly page: number;
};

export type RoomCardArtEntry = PrintExplorationArtEntry & {
  readonly category: "room";
  readonly page: number;
};

export type RoomTokenArtEntry = {
  readonly kind: string;
  readonly face: string;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const printById = new Map<string, PrintExplorationArtEntry>(
  (printMap.cards as PrintExplorationArtEntry[]).map((e) => [e.id, e]),
);

const questById = new Map<string, QuestMapArtEntry>();
const questByPage = new Map<number, QuestMapArtEntry>();
for (const card of printMap.cards as PrintExplorationArtEntry[]) {
  if (card.category !== "quest_map") continue;
  const entry: QuestMapArtEntry = { ...card, category: "quest_map", page: card.printPage };
  questById.set(entry.id, entry);
  questByPage.set(entry.page, entry);
}

const roomCardById = new Map<string, RoomCardArtEntry>();
for (const card of printMap.cards as PrintExplorationArtEntry[]) {
  if (card.category !== "room") continue;
  const entry: RoomCardArtEntry = { ...card, category: "room", page: card.printPage };
  roomCardById.set(entry.id, entry);
}

const tokenByKind = new Map<string, RoomTokenArtEntry>(
  (roomTokenPrintMap.tokens as RoomTokenArtEntry[])
    .filter((e) => e.face === "revealed")
    .map((e) => [e.kind, e]),
);

/** Public URL path served by Vite from the gitignored print cache dir. */
export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupQuestMapArt(layoutId: string): QuestMapArtEntry | undefined {
  return questById.get(layoutId);
}

export function lookupQuestMapArtByPage(page: number): QuestMapArtEntry | undefined {
  return questByPage.get(page);
}

export function lookupRoomTokenArt(kind: string): RoomTokenArtEntry | undefined {
  return tokenByKind.get(kind);
}

export function lookupRoomCardArt(roomCardId: string): RoomCardArtEntry | undefined {
  return roomCardById.get(roomCardId);
}

export function lookupPrintExplorationArt(engineId: string): PrintExplorationArtEntry | undefined {
  return printById.get(engineId);
}

/** Local cache path under `.cache/print-card-art/` (e.g. `png/page_….png`). */
export function cachedPrintExplorationUrl(entry: Pick<PrintExplorationArtEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function explorationArtMapMeta(): {
  readonly printSchema: string;
  readonly roomTokenPrintSchema: string;
  readonly questMapCount: number;
  readonly roomCardCount: number;
  readonly roomTokenCount: number;
  readonly printCardCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    printSchema: printMap.schema,
    roomTokenPrintSchema: roomTokenPrintMap.schema,
    questMapCount: questById.size,
    roomCardCount: roomCardById.size,
    roomTokenCount: tokenByKind.size,
    printCardCount: printMap.cards.length,
    pendingConfirmation: [
      ...printMap.pendingConfirmation,
      ...roomTokenPrintMap.pendingConfirmation,
    ],
  };
}

export function printExplorationArtMapMeta(): {
  readonly schema: string;
  readonly cardCount: number;
  readonly uiCardCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: printMap.schema,
    cardCount: printMap.cards.length,
    uiCardCount: printMap.source.uiCardCount,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}

export function roomTokenPrintArtMapMeta(): {
  readonly schema: string;
  readonly tokenCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: roomTokenPrintMap.schema,
    tokenCount: roomTokenPrintMap.tokens.length,
    pendingConfirmation: roomTokenPrintMap.pendingConfirmation,
  };
}
