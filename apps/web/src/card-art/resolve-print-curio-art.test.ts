import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import printMap from "./curio-print-art-map.json";
import {
  cachedPrintCurioUrl,
  lookupPrintCurioFace,
  printCurioArtMapMeta,
} from "./resolve-print-curio-art";

const curioNorm = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../../../packages/data/normalized/corebox/curio.json"),
    "utf8",
  ),
);

describe("print curio art map", () => {
  it("maps 24 curios with TrimBox geometry and page-aligned ids", () => {
    const meta = printCurioArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-curio-art-map.v1");
    expect(meta.cardCount).toBe(24);
    expect(meta.trimBoxPt).toMatchObject({ widthPt: 178.58, heightPt: 249.45, x0Pt: 21, y0Pt: 21 });
    for (const card of printMap.cards) {
      const page = Number(card.id.replace("curio:p", ""));
      expect(card.faces.front.printPage).toBe(page);
      expect(card.faces.back.printPage).toBe(page);
      expect(card.faces.front.cropMethod).toBe("trimbox");
      expect(card.faces.front.pngRel).toMatch(/^png\/.+_p\d{3}\.png$/);
      expect(card.faces.front.pngRel).toContain(`_p${String(page).padStart(3, "0")}.png`);
      expect(cachedPrintCurioUrl(card.faces.front)).toBe(
        `/print-card-art/${card.faces.front.pngRel}`,
      );
      expect(lookupPrintCurioFace(card.id)?.faces.front.pngRel).toBe(card.faces.front.pngRel);
    }
  });

  it("matches normalized card names to text snippets", () => {
    const byId = new Map<string, string>(
      (curioNorm.cards as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );
    for (const card of printMap.cards) {
      const name = byId.get(card.id);
      expect(name).toBe(card.name);
      expect(card.faces.front.textSnippet.toLowerCase()).toContain(
        name!.split(" ")[0]!.toLowerCase(),
      );
    }
  });

  it("binds Sarcophagus to FRONT p021", () => {
    const face = lookupPrintCurioFace("curio:p021");
    expect(face?.name).toBe("Sarcophagus");
    expect(face?.faces.front.printPage).toBe(21);
    expect(face?.faces.front.primaryPdf).toContain("CURIO_FRONT");
  });
});
