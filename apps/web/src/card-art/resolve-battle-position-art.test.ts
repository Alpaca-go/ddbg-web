import { describe, expect, it } from "vitest";
import battleMap from "./battle-position-art-map.json";
import {
  battlePositionArtMapMeta,
  cachedBattleRasterUrl,
  listHeroTokenArt,
  lookupHeroTokenArt,
} from "./resolve-battle-position-art";

describe("TTS hero token art map", () => {
  it("maps eight formal hero tokens from committed URLs", () => {
    const meta = battlePositionArtMapMeta();
    expect(meta.schema).toBe("ddbg.tts-hero-token-art-map.v1");
    expect(meta.heroTokenCount).toBe(8);
    expect(listHeroTokenArt().length).toBe(8);
    for (const token of battleMap.heroTokens) {
      expect(token.imageUrl).toMatch(/^https:\/\/steamusercontent/);
      expect(lookupHeroTokenArt(token.hero)?.cacheName).toBe(token.cacheName);
    }
  });

  it("does not reference stance color tiles", () => {
    const json = JSON.stringify(battleMap);
    expect(json).not.toContain("stance-color-tile");
    expect(json).not.toContain("colorTiles");
    expect(cachedBattleRasterUrl("hero-token-crusader")).toBe(
      "/tts-card-art/hero-token-crusader.png",
    );
  });

  it("records pending items instead of inventing missing art", () => {
    expect(battlePositionArtMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(lookupHeroTokenArt("JESTER")).toBeUndefined();
  });
});
