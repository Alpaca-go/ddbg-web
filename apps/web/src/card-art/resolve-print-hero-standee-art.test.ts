import { describe, expect, it } from "vitest";
import standeeMap from "./hero-standee-print-art-map.json";
import {
  cachedPrintHeroStandeeUrl,
  heroStandeeArtMapMeta,
  listHeroStandeeArt,
  lookupHeroStandeeArt,
} from "./resolve-print-hero-standee-art";

describe("print hero standee art map", () => {
  it("maps eight formal heroes to DH punchboard pngRel slugs", () => {
    const meta = heroStandeeArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hero-standee-art-map.v1");
    expect(meta.standeeCount).toBe(8);
    expect(listHeroStandeeArt().length).toBe(8);
    for (const row of standeeMap.standees) {
      expect(row.diecutWhPt).toEqual([177.83, 237.09]);
      expect(lookupHeroStandeeArt(row.hero)?.pngRel).toBe(row.pngRel);
      expect(cachedPrintHeroStandeeUrl(row)).toBe(`/print-card-art/${row.pngRel}`);
    }
  });

  it("does not reference TTS hero-token cache paths", () => {
    const json = JSON.stringify(standeeMap);
    expect(json).not.toContain("hero-token-");
    expect(json).not.toContain("tts-card-art");
    expect(json).not.toContain("steamusercontent");
  });

  it("records pending items instead of inventing extension heroes", () => {
    expect(heroStandeeArtMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(lookupHeroStandeeArt("JESTER")).toBeUndefined();
  });
});
