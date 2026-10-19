import { describe, expect, it } from "vitest";
import printMap from "./hero-skill-print-art-map.json";
import {
  cachedPrintHeroSkillUrl,
  lookupPrintHeroSkillFace,
  printHeroSkillArtMapMeta,
} from "./resolve-print-hero-skill-art";

describe("print hero skill art map (Kyries CSV)", () => {
  it("covers all 231 normalized core-box hero skills with pngRel under png/", () => {
    const meta = printHeroSkillArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hero-skill-art-map.v1");
    expect(meta.cardCount).toBe(231);
    expect(printMap.cards.length).toBe(231);
    expect(meta.uncoveredEngineIds).toEqual([]);
    for (const card of printMap.cards) {
      expect(card.pngRel).toMatch(/^png\/.+\.png$/);
      expect(card.reviewVerdict).toBe("ok");
      expect(lookupPrintHeroSkillFace(card.id)?.pngRel).toBe(card.pngRel);
      expect(cachedPrintHeroSkillUrl(card)).toBe(`/print-card-art/${card.pngRel}`);
      expect(cachedPrintHeroSkillUrl(card)).not.toContain("/tts-card-art");
    }
  });

  it("binds Smite I to SKILLS_FRONT p001", () => {
    const smite = lookupPrintHeroSkillFace("hero_skill:p001");
    expect(smite).toMatchObject({
      name: "Smite",
      level: 1,
      hero: "CRUSADER",
      printPage: 1,
    });
    expect(smite?.pngRel).toContain("_p001.png");
  });

  it("returns undefined for unmapped ids", () => {
    expect(lookupPrintHeroSkillFace("hero_skill:missing")).toBeUndefined();
  });
});
