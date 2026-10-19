import { cachedFaceSheetUrl } from "./resolve-card-art";
import {
  cachedPrintMonsterUrl,
  lookupPrintMonsterFace,
  type PrintMonsterArtEntry,
} from "./resolve-print-monster-art";
import {
  lookupMonsterTtsFace,
  monsterTtsFaceSprite,
  type MonsterTtsFaceArtEntry,
} from "./resolve-monster-tts-face-art";

export type MonsterArtPrint = {
  readonly kind: "print";
  readonly entry: PrintMonsterArtEntry;
  readonly imageUrl: string;
};

export type MonsterArtTts = {
  readonly kind: "tts";
  readonly entry: MonsterTtsFaceArtEntry;
  readonly sheetUrl: string;
  readonly sprite: ReturnType<typeof monsterTtsFaceSprite>;
};

export type MonsterArtResolved = MonsterArtPrint | MonsterArtTts;

/** Print PNG first; TTS atlas cell when print map has no row or cache misses at runtime. */
export function resolveMonsterArt(monsterCardId: string): MonsterArtResolved | undefined {
  const print = lookupPrintMonsterFace(monsterCardId);
  if (print) {
    return { kind: "print", entry: print, imageUrl: cachedPrintMonsterUrl(print) };
  }
  const tts = lookupMonsterTtsFace(monsterCardId);
  if (tts) {
    const sprite = monsterTtsFaceSprite(tts);
    return {
      kind: "tts",
      entry: tts,
      sheetUrl: cachedFaceSheetUrl(tts, "png"),
      sprite,
    };
  }
  return undefined;
}
