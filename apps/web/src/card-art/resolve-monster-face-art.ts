import monsterMap from "./monster-face-art-map.json";
import {
  atlasBackgroundPosition,
  atlasBackgroundSize,
  cachedFaceSheetUrl,
  type AtlasFaceEntry,
} from "./resolve-card-art";

export type MonsterFaceArtEntry = AtlasFaceEntry & {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly page: number;
  readonly category: string;
  readonly ttsCardId: number;
  readonly cellSource: string;
};

const byId = new Map<string, MonsterFaceArtEntry>(
  (monsterMap.cards as MonsterFaceArtEntry[]).map((card) => [card.id, card]),
);

export function lookupMonsterFace(monsterCardId: string): MonsterFaceArtEntry | undefined {
  return byId.get(monsterCardId);
}

export function monsterFaceSprite(entry: MonsterFaceArtEntry) {
  return {
    sheetUrl: cachedFaceSheetUrl(entry, "png"),
    backgroundSize: atlasBackgroundSize(entry),
    backgroundPosition: atlasBackgroundPosition(entry),
  };
}

export function monsterFaceArtMapMeta(): {
  readonly schema: string;
  readonly cardCount: number;
  readonly atlasCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: monsterMap.schema,
    cardCount: monsterMap.cards.length,
    atlasCount: Object.keys(monsterMap.atlases || {}).length,
    pendingConfirmation: monsterMap.pendingConfirmation,
  };
}
