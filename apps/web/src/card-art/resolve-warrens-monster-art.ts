import printMap from "./warrens-monster-print-art-map.json";
import { PRINT_CARD_ART_PUBLIC_PREFIX } from "./resolve-print-monster-art";

export type PrintWarrensMonsterArtEntry = {
  readonly id: string;
  readonly engineId?: string;
  readonly name: string;
  readonly level: number;
  readonly category: string;
  readonly face: "front" | "back";
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
};

const byEngineFace = new Map<string, PrintWarrensMonsterArtEntry>();
for (const row of printMap.cards as PrintWarrensMonsterArtEntry[]) {
  const engineId = row.engineId ?? row.id.replace(/:back$/, "");
  byEngineFace.set(`${engineId}:${row.face}`, row);
}

export function lookupPrintWarrensMonsterFace(
  monsterCardId: string,
  face: "front" | "back" = "front",
): PrintWarrensMonsterArtEntry | undefined {
  return byEngineFace.get(`${monsterCardId}:${face}`);
}

export function cachedPrintWarrensMonsterUrl(
  entry: Pick<PrintWarrensMonsterArtEntry, "pngRel">,
): string {
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${entry.pngRel.replace(/^\//, "")}`;
}
