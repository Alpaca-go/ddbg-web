import { describe, expect, it } from "vitest";
import battleMap from "./battle-position-art-map.json";
import {
  battlePositionArtMapMeta,
  cachedBattleRasterUrl,
  listStanceSlotArt,
  lookupHeroTokenArt,
  lookupStanceSlotArt,
} from "./resolve-battle-position-art";

describe("TTS battle position art map", () => {
  it("maps four stance rows and eight formal hero tokens from committed URLs", () => {
    const meta = battlePositionArtMapMeta();
    expect(meta.schema).toBe("ddbg.tts-battle-position-art-map.v1");
    expect(meta.stanceSlotCount).toBe(4);
    expect(meta.heroTokenCount).toBe(8);
    expect(listStanceSlotArt().map((s) => s.stance)).toEqual([
      "aggressive",
      "defensive",
      "ranged",
      "support",
    ]);
    for (const token of battleMap.heroTokens) {
      expect(token.imageUrl).toMatch(/^https:\/\/steamusercontent/);
      expect(lookupHeroTokenArt(token.hero)?.cacheName).toBe(token.cacheName);
    }
  });

  it("links aggressive/defensive rows to Color Room Tile 1-2 cache", () => {
    const front = lookupStanceSlotArt("aggressive");
    const mid = lookupStanceSlotArt("defensive");
    expect(front?.cacheName).toBe("stance-color-tile-1-2");
    expect(mid?.cacheName).toBe(front?.cacheName);
    expect(lookupStanceSlotArt("ranged")?.cacheName).toBe("stance-color-tile-3");
    expect(cachedBattleRasterUrl("stance-color-tile-3")).toBe(
      "/tts-card-art/stance-color-tile-3.png",
    );
  });

  it("records pending items instead of inventing missing art", () => {
    expect(battlePositionArtMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(lookupStanceSlotArt("support")?.cacheName).toBeNull();
    expect(lookupHeroTokenArt("JESTER")).toBeUndefined();
  });
});
