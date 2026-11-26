import { describe, expect, it } from "vitest";
import printMap from "./hero-skill-print-art-map.json";
import skills from "../../../../packages/data/normalized/corebox/hero_skill.json";
import {
  cachedPrintHeroSkillUrl,
  lookupPrintHeroSkillFace,
  printHeroSkillArtMapMeta,
} from "./resolve-print-hero-skill-art";

describe("print hero skill art map (Kyries CSV)", () => {
  it("covers every formal skill id once and preserves the reviewed core crop paths", () => {
    const meta = printHeroSkillArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hero-skill-art-map.v1");
    expect(meta.cardCount).toBe(378);
    expect(printMap.cards.length).toBe(378);
    expect(meta.uncoveredEngineIds).toEqual([]);
    const ids = printMap.cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(skills.cards.map((card) => card.id)));
    const core = printMap.cards.filter((c) => c.id.startsWith("hero_skill:core:"));
    expect(core).toHaveLength(231);
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

  it("matches the normalized physical print source including Musketeer local pages", () => {
    for (const card of skills.cards) {
      expect(lookupPrintHeroSkillFace(card.id)).toMatchObject({
        name: card.name,
        level: card.level,
        hero: card.hero ?? "ABOMINATION",
        printPage: card.source.page,
        primaryPdf: card.source.file
          .split("/")
          .at(-1)!
          .replace(/\.pdf$/, ""),
      });
    }
    expect(lookupPrintHeroSkillFace("hero_skill:musketeer:h18:p358")?.printPage).toBe(1);
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
