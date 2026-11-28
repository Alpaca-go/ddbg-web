import {
  cachedPrintMonsterUrl,
  lookupPrintMonsterFace,
  type PrintMonsterArtEntry,
} from "./resolve-print-monster-art";
import {
  cachedPrintWarrensMonsterUrl,
  lookupPrintWarrensMonsterFace,
} from "./resolve-warrens-monster-art";

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
  const warrens = lookupPrintWarrensMonsterFace(monsterCardId);
  if (warrens) {
    return {
      kind: "print",
      entry: warrens as unknown as PrintMonsterArtEntry,
      imageUrl: cachedPrintWarrensMonsterUrl(warrens),
    };
  }
  return undefined;
}
