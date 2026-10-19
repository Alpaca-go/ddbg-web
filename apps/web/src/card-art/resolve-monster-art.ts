import {
  cachedPrintMonsterUrl,
  lookupPrintMonsterFace,
  type PrintMonsterArtEntry,
} from "./resolve-print-monster-art";

export type MonsterArtPrint = {
  readonly kind: "print";
  readonly entry: PrintMonsterArtEntry;
  readonly imageUrl: string;
};

export type MonsterArtResolved = MonsterArtPrint;

/** Print PNG when the reviewed map has a row; cache miss is handled in UI. */
export function resolveMonsterArt(monsterCardId: string): MonsterArtResolved | undefined {
  const print = lookupPrintMonsterFace(monsterCardId);
  if (print) {
    return { kind: "print", entry: print, imageUrl: cachedPrintMonsterUrl(print) };
  }
  return undefined;
}
