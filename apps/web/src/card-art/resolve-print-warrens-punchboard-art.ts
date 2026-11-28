import printMap from "./warrens-punchboard-print-art-map.json";

export type WarrensPunchboardArtEntry = {
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

const byHeroFace = new Map<string, WarrensPunchboardArtEntry>(
  (printMap.standees as WarrensPunchboardArtEntry[]).map((e) => [`${e.hero}:${e.face}`, e]),
);

export function lookupWarrensPunchboardArt(
  hero: "LEPER" | "ANTIQUARIAN",
  face: "front" | "back" = "front",
): WarrensPunchboardArtEntry | undefined {
  return byHeroFace.get(`${hero}:${face}`);
}

export function listWarrensPunchboardArt(): readonly WarrensPunchboardArtEntry[] {
  return printMap.standees as WarrensPunchboardArtEntry[];
}

export function warrensPunchboardArtMapMeta(): {
  readonly schema: string;
  readonly standeeCount: number;
  readonly geometryVerified: boolean;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: printMap.schema,
    standeeCount: printMap.standees.length,
    geometryVerified: printMap.source.geometryVerified === true,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}

export function cachedWarrensPunchboardArtUrl(
  entry: Pick<WarrensPunchboardArtEntry, "pngRel">,
): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `/print-card-art/${rel}`;
}
