import explorationMap from "./exploration-art-map.json";
import {
  CARD_ART_CACHE_PUBLIC_PREFIX,
  atlasBackgroundPosition,
  atlasBackgroundSize,
  cachedFaceSheetUrl,
} from "./resolve-card-art";

export type QuestMapArtEntry = {
  readonly id: string;
  readonly page: number;
  readonly imageUrl: string;
  readonly cacheName: string;
};

export type RoomTokenArtEntry = {
  readonly kind: string;
  readonly imageUrl: string;
  readonly cacheName: string;
};

export type RoomCardArtEntry = {
  readonly id: string;
  readonly name: string;
  readonly page: number;
  readonly boss: boolean;
  readonly faceUrl: string;
  readonly backUrl: string | null;
  readonly numWidth: number;
  readonly numHeight: number;
  readonly deckId: string;
  readonly cell: number;
  readonly ttsCardId: number;
  readonly cellSource: string;
};

const questById = new Map<string, QuestMapArtEntry>(
  (explorationMap.questMapPages as QuestMapArtEntry[]).map((e) => [e.id, e]),
);
const questByPage = new Map<number, QuestMapArtEntry>(
  (explorationMap.questMapPages as QuestMapArtEntry[]).map((e) => [e.page, e]),
);
const tokenByKind = new Map<string, RoomTokenArtEntry>(
  (explorationMap.roomTokens as RoomTokenArtEntry[]).map((e) => [e.kind, e]),
);
const roomCardById = new Map<string, RoomCardArtEntry>(
  (explorationMap.roomCards as RoomCardArtEntry[]).map((e) => [e.id, e]),
);

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

export function cachedRasterUrl(cacheName: string, ext: "png" | "jpg" = "png"): string {
  return `${CARD_ART_CACHE_PUBLIC_PREFIX}/${cacheName}.${ext}`;
}

export function roomCardSprite(entry: RoomCardArtEntry) {
  return {
    sheetUrl: cachedFaceSheetUrl(entry, "png"),
    backgroundSize: atlasBackgroundSize(entry),
    backgroundPosition: atlasBackgroundPosition(entry),
  };
}

export function explorationArtMapMeta(): {
  readonly schema: string;
  readonly questMapCount: number;
  readonly roomTokenCount: number;
  readonly roomCardCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: explorationMap.schema,
    questMapCount: explorationMap.questMapPages.length,
    roomTokenCount: explorationMap.roomTokens.length,
    roomCardCount: explorationMap.roomCards.length,
    pendingConfirmation: explorationMap.pendingConfirmation,
  };
}
