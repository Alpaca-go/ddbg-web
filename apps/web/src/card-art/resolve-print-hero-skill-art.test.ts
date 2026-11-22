import { describe, expect, it } from "vitest";
import printMap from "./hero-skill-print-art-map.json";
import {
  cachedPrintHeroSkillUrl,
  lookupPrintHeroSkillFace,
  printHeroSkillArtMapMeta,
} from "./resolve-print-hero-skill-art";

describe("print hero skill art map (Kyries CSV)", () => {
  it("covers 231 core + 147 extension art-only skills with pngRel under png/", () => {
    const meta = printHeroSkillArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hero-skill-art-map.v1");
    expect(meta.cardCount).toBe(378);
    expect(printMap.cards.length).toBe(378);
    expect(meta.uncoveredEngineIds).toEqual([]);
    const core = printMap.cards.filter((c) => c.dataStatus === "verified-data");
    const artOnly = printMap.cards.filter((c) => c.dataStatus === "art-only");
    expect(core).toHaveLength(231);
    expect(artOnly).toHaveLength(147);
    for (const card of printMap.cards) {
      expect(card.pngRel).toMatch(/^png\/.+\.png$/);
      expect(lookupPrintHeroSkillFace(card.id)?.pngRel).toBe(card.pngRel);
      expect(cachedPrintHeroSkillUrl(card)).toBe(`/print-card-art/${card.pngRel}`);
      expect(cachedPrintHeroSkillUrl(card)).not.toContain("/tts-card-art");
    }
    for (const card of core) {
      expect(card.reviewVerdict).toBe("ok");
    }
  });

  it("binds extension art-only rows to TDH/Musketeer print pages (Q-103–Q-107)", () => {
    expect(lookupPrintHeroSkillFace("hero_skill:art:leper:p274")?.printPage).toBe(274);
    expect(lookupPrintHeroSkillFace("hero_skill:art:antiquarian:p295")?.printPage).toBe(295);
    expect(lookupPrintHeroSkillFace("hero_skill:art:man-at-arms:p232")?.printPage).toBe(232);
    expect(lookupPrintHeroSkillFace("hero_skill:art:flagellant:p253")?.printPage).toBe(253);
    expect(lookupPrintHeroSkillFace("hero_skill:art:shieldbreaker:p316")?.printPage).toBe(316);
    expect(lookupPrintHeroSkillFace("hero_skill:art:houndmaster:p337")?.printPage).toBe(337);
    expect(lookupPrintHeroSkillFace("hero_skill:art:musketeer:p001")?.printPage).toBe(1);
    expect(lookupPrintHeroSkillFace("hero_skill:art:flagellant:p274")).toBeUndefined();
  });

  it("binds Smite I to SKILLS_FRONT p001", () => {
    const smite = lookupPrintHeroSkillFace("hero_skill:core:h01:p001");
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
