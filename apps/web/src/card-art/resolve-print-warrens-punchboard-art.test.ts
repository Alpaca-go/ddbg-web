import { describe, expect, it } from "vitest";
import standeeMap from "./warrens-punchboard-print-art-map.json";
import {
  cachedWarrensPunchboardArtUrl,
  listWarrensPunchboardArt,
  lookupWarrensPunchboardArt,
  warrensPunchboardArtMapMeta,
} from "./resolve-print-warrens-punchboard-art";

describe("Warrens punchboard print art map", () => {
  it("maps LEPER / ANTIQUARIAN FRONT+BACK slugs", () => {
    const meta = warrensPunchboardArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-warrens-punchboard-art-map.v1");
    expect(meta.standeeCount).toBe(4);
    expect(meta.geometryVerified).toBe(false);
    expect(listWarrensPunchboardArt()).toHaveLength(4);
    for (const row of standeeMap.standees) {
      expect(row.diecutWhPt).toEqual([178.71, 237.99]);
      expect(
        lookupWarrensPunchboardArt(
          row.hero as "LEPER" | "ANTIQUARIAN",
          row.face as "front" | "back",
        )?.pngRel,
      ).toBe(row.pngRel);
      expect(cachedWarrensPunchboardArtUrl(row)).toBe(`/print-card-art/${row.pngRel}`);
    }
  });

  it("does not reference TTS or formal-eight DH paths", () => {
    const json = JSON.stringify(standeeMap);
    expect(json).not.toContain("DARKEST_HEROES");
    expect(json).not.toContain("tts-card-art");
    expect(json).not.toContain("hero-token-");
  });
});
