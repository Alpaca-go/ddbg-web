import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import printMap from "./trinket-print-art-map.json";
import {
  cachedPrintTrinketUrl,
  lookupPrintTrinketFace,
  printTrinketArtMapMeta,
} from "./resolve-print-trinket-art";

const trinketNorm = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../../../packages/data/normalized/corebox/trinket.json"),
    "utf8",
  ),
);

function backTier(page: number) {
  if (page <= 14) return 1;
  if (page <= 26) return 2;
  return 3;
}

describe("print trinket art map", () => {
  it("maps 38 trinkets with landscape TrimBox and back tiers", () => {
    const meta = printTrinketArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-trinket-art-map.v1");
    expect(meta.cardCount).toBe(38);
    expect(meta.trimBoxPt).toMatchObject({ widthPt: 192.76, heightPt: 124.72, landscape: true });
    for (const card of printMap.cards) {
      const page = Number(card.id.replace("trinket:p", ""));
      expect(card.faces.front.printPage).toBe(page);
      expect(card.backLevel).toBe(backTier(page));
      expect(card.faces.back.primaryPdf).toContain("TRINKETS_BACK");
      expect(card.faces.back.pngRel).toContain("TRINKETS_BACK");
      expect(cachedPrintTrinketUrl(card.faces.front)).toMatch(/^\/print-card-art\/png\//);
      expect(lookupPrintTrinketFace(card.id, "back")?.faceEntry.pngRel).toBe(
        card.faces.back.pngRel,
      );
    }
  });

  it("matches normalized names and back_level", () => {
    type NormTrinket = { id: string; name: string; back_level: number };
    const byId = new Map<string, NormTrinket>(
      (trinketNorm.cards as NormTrinket[]).map((c) => [c.id, c]),
    );
    for (const card of printMap.cards) {
      const norm = byId.get(card.id);
      expect(norm).toBeDefined();
      expect(norm!.name).toBe(card.name);
      expect(norm!.back_level).toBe(card.backLevel);
      expect(card.faces.front.textSnippet).toBe(card.name);
    }
  });
});
