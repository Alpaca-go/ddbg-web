import printMap from "./monster-stance-print-art-map.json";

export type MonsterStanceBoardEntry = {
  readonly id: string;
  readonly side: "front" | "back";
  readonly category: string;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly cropMethod: string;
  readonly matchStatus: string;
  readonly pdfRel: string;
};

export type MonsterStanceSlotEntry = {
  readonly stance: string;
  readonly rank: number;
  readonly labelZh: string;
};

const boardBySide = new Map<string, MonsterStanceBoardEntry>(
  (printMap.boards as MonsterStanceBoardEntry[]).map((b) => [b.side, b]),
);

const stanceSlots = printMap.stanceSlots as MonsterStanceSlotEntry[];

/** Public URL path served by Vite from the gitignored print cache dir. */
export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupMonsterStanceBoard(
  side: "front" | "back" = "front",
): MonsterStanceBoardEntry | undefined {
  return boardBySide.get(side);
}

export function listMonsterStanceSlots(): readonly MonsterStanceSlotEntry[] {
  return stanceSlots;
}

export function lookupMonsterStanceSlot(stance: string): MonsterStanceSlotEntry | undefined {
  return stanceSlots.find((s) => s.stance === stance);
}

/** Local cache path under `.cache/print-card-art/` (e.g. `png/page_….png`). */
export function cachedPrintMonsterStanceUrl(
  entry: Pick<MonsterStanceBoardEntry, "pngRel">,
): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function monsterStanceArtMapMeta(): {
  readonly schema: string;
  readonly boardCount: number;
  readonly stanceSlotCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: printMap.schema,
    boardCount: printMap.boards.length,
    stanceSlotCount: stanceSlots.length,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
