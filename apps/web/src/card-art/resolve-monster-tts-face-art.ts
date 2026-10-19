import monsterMap from "./monster-face-art-map.json";
import {
  atlasBackgroundPosition,
  atlasBackgroundSize,
  cachedFaceSheetUrl,
  type AtlasFaceEntry,
} from "./resolve-card-art";

export type MonsterTtsFaceArtEntry = AtlasFaceEntry & {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly page: number;
  readonly category: string;
  readonly ttsCardId: number;
  readonly cellSource: string;
};

const byId = new Map<string, MonsterTtsFaceArtEntry>(
  (monsterMap.cards as MonsterTtsFaceArtEntry[]).map((card) => [card.id, card]),
);

export function lookupMonsterTtsFace(monsterCardId: string): MonsterTtsFaceArtEntry | undefined {
  return byId.get(monsterCardId);
}

export function monsterTtsFaceSprite(entry: MonsterTtsFaceArtEntry) {
  return {
    sheetUrl: cachedFaceSheetUrl(entry, "png"),
    backgroundSize: atlasBackgroundSize(entry),
    backgroundPosition: atlasBackgroundPosition(entry),
  };
}

export function monsterTtsFaceArtMapMeta(): {
  readonly schema: string;
  readonly cardCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: monsterMap.schema,
    cardCount: monsterMap.cards.length,
    pendingConfirmation: monsterMap.pendingConfirmation,
  };
}
