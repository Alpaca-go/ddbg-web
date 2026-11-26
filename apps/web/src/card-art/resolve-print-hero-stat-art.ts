import printMap from "./hero-stat-print-art-map.json";

export type PrintHeroStatDataStatus = "verified-data" | "art-only";

export type PrintHeroStatFaceEntry = {
  readonly id: string | null;
  readonly rawId: string;
  readonly face: "front" | "back";
  readonly hero: string;
  readonly level: number | null;
  readonly dataStatus: PrintHeroStatDataStatus;
  readonly pngRel: string;
  readonly printPage: number;
  readonly primaryPdf: string;
  readonly matchMethod: string;
  readonly reviewVerdict: string;
};

const faces = printMap.faces as readonly PrintHeroStatFaceEntry[];
const byId = new Map<string, PrintHeroStatFaceEntry>();
for (const face of faces) if (face.id !== null) byId.set(face.id, face);

export const PRINT_CARD_ART_PUBLIC_PREFIX = "/print-card-art";

export function lookupPrintHeroStatFace(heroStatId: string): PrintHeroStatFaceEntry | undefined {
  return byId.get(heroStatId);
}

export function cachedPrintHeroStatUrl(entry: Pick<PrintHeroStatFaceEntry, "pngRel">): string {
  const rel = entry.pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

export function printHeroStatArtMapMeta(): {
  readonly schema: string;
  readonly faceCount: number;
  readonly verifiedDataCount: number;
  readonly artOnlyCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: printMap.schema,
    faceCount: faces.length,
    verifiedDataCount: faces.filter((f) => f.dataStatus === "verified-data").length,
    artOnlyCount: faces.filter((f) => f.dataStatus === "art-only").length,
    pendingConfirmation: printMap.pendingConfirmation,
  };
}
