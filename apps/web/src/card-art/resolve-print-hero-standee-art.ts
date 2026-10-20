import printMap from "./hero-standee-print-art-map.json";

export type HeroStandeeArtEntry = {
  readonly hero: string;
  readonly face: string;
  readonly pngRel: string;
  readonly primaryPdf: string;
  readonly printPage: number;
  readonly diecutPt: readonly number[];
  readonly diecutWhPt: readonly number[];
  readonly cropMethod: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const standeeByHero = new Map<string, HeroStandeeArtEntry>(
  (printMap.standees as HeroStandeeArtEntry[]).map((e) => [e.hero, e]),
);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupHeroStandeeArt(heroName: string): HeroStandeeArtEntry | undefined {
  return standeeByHero.get(heroName);
}

export function listHeroStandeeArt(): readonly HeroStandeeArtEntry[] {
  return printMap.standees as HeroStandeeArtEntry[];
}

export function cachedPrintHeroStandeeUrl(entry: Pick<HeroStandeeArtEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function heroStandeeArtMapMeta(): {
  readonly schema: string;
  readonly standeeCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: printMap.schema,
    standeeCount: printMap.standees.length,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
