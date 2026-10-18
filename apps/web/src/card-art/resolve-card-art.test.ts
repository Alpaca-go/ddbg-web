import { describe, expect, it } from "vitest";
import {
  atlasBackgroundPosition,
  atlasBackgroundSize,
  cachedFaceSheetUrl,
  heroSkillFaceMapMeta,
  lookupHeroSkillFace,
} from "./resolve-card-art";
import faceMap from "./hero-skill-face-map.json";

const FORMAL = [
  "CRUSADER",
  "HELLION",
  "HIGHWAYMAN",
  "VESTAL",
  "BOUNTY HUNTER",
  "PLAGUE DOCTOR",
  "GRAVE ROBBER",
  "OCCULTIST",
] as const;

describe("TTS hero skill face map", () => {
  it("covers eight formal heroes × 21 skill cards with FaceURL from map atlases only", () => {
    const meta = heroSkillFaceMapMeta();
    expect(meta.schema).toBe("ddbg.tts-hero-skill-face-map.v1");
    expect(meta.cardCount).toBe(168);
    expect(new Set(faceMap.cards.map((c) => c.hero))).toEqual(new Set(FORMAL));
    for (const card of faceMap.cards) {
      const atlas = faceMap.atlases[card.deckId as keyof typeof faceMap.atlases];
      expect(atlas).toBeDefined();
      expect(card.faceUrl).toBe(atlas!.faceUrl);
      expect(card.numWidth).toBe(10);
      expect(card.numHeight).toBe(7);
      expect(card.cell).toBeGreaterThanOrEqual(0);
      expect(card.cell).toBeLessThan(70);
    }
  });

  it("maps Smite I/II to deck 422 cells 21/22 (visually verified)", () => {
    const smiteI = lookupHeroSkillFace("hero_skill:p001");
    const smiteII = lookupHeroSkillFace("hero_skill:p002");
    expect(smiteI).toMatchObject({
      name: "Smite",
      level: 1,
      deckId: "422",
      cell: 21,
      cellSource: "tts_card_object",
    });
    expect(smiteII).toMatchObject({
      name: "Smite",
      level: 2,
      deckId: "422",
      cell: 22,
      cellSource: "atlas_level_stride",
    });
    expect(cachedFaceSheetUrl(smiteI!)).toBe("/tts-card-art/face-422.png");
    expect(atlasBackgroundSize(smiteI!)).toBe("1000% 700%");
    expect(atlasBackgroundPosition(smiteI!)).toBe(`${(1 / 9) * 100}% ${(2 / 6) * 100}%`);
  });

  it("lists 待确认 items instead of inventing unmapped FaceURL", () => {
    expect(heroSkillFaceMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(lookupHeroSkillFace("hero_skill:missing")).toBeUndefined();
  });
});
