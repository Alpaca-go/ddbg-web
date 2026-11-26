import { describe, expect, it } from "vitest";
import printMap from "./hero-stat-print-art-map.json";
import stats from "../../../../packages/data/normalized/corebox/hero_stat.json";
import {
  cachedPrintHeroStatUrl,
  lookupPrintHeroStatFace,
  printHeroStatArtMapMeta,
} from "./resolve-print-hero-stat-art";

const EIGHTEEN = [
  "ABOMINATION",
  "ANTIQUARIAN",
  "ARBALEST",
  "BOUNTY HUNTER",
  "CRUSADER",
  "FLAGELLANT",
  "GRAVE ROBBER",
  "HELLION",
  "HIGHWAYMAN",
  "HOUNDMASTER",
  "JESTER",
  "LEPER",
  "MAN-AT-ARMS",
  "MUSKETEER",
  "OCCULTIST",
  "PLAGUE DOCTOR",
  "SHIELDBREAKER",
  "VESTAL",
];

describe("print hero stat art map (18 heroes)", () => {
  it("maps all 18 hero names with pngRel under png/", () => {
    const meta = printHeroStatArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-hero-stat-art-map.v1");
    expect(meta.faceCount).toBe(printMap.faces.length);
    const heroes = new Set(printMap.faces.map((f) => f.hero));
    for (const hero of EIGHTEEN) {
      expect(heroes.has(hero)).toBe(true);
    }
    for (const face of printMap.faces) {
      expect(face.pngRel).toMatch(/^png\/.+\.png$/);
      if (face.id !== null) expect(lookupPrintHeroStatFace(face.id)?.pngRel).toBe(face.pngRel);
      else expect(lookupPrintHeroStatFace(`${face.rawId}:${face.face}`)).toBeUndefined();
      expect(cachedPrintHeroStatUrl(face)).toBe(`/print-card-art/${face.pngRel}`);
    }
  });

  it("binds Crusader I to core Hero_STAT FRONT p1", () => {
    const crusader = lookupPrintHeroStatFace("hero_stat:core:h01:p001:front");
    expect(crusader).toMatchObject({
      hero: "CRUSADER",
      dataStatus: "verified-data",
      printPage: 1,
    });
    expect(crusader?.pngRel).toContain("_p001.png");
  });

  it("indexes only formal STAT ids and matches each normalized PDF and page", () => {
    const ids = printMap.faces.flatMap((face) => (face.id === null ? [] : [face.id]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(stats.cards.map((card) => card.id)));
    for (const card of stats.cards) {
      expect(lookupPrintHeroStatFace(card.id)).toMatchObject({
        hero: card.name,
        rawId: card.rawId,
        level: card.level,
        face: card.face,
        dataStatus: "verified-data",
        printPage: card.source.page,
        primaryPdf: card.source.file
          .split("/")
          .at(-1)!
          .replace(/\.pdf$/, ""),
      });
    }
  });

  it("returns undefined for unknown ids", () => {
    expect(lookupPrintHeroStatFace("hero_stat:missing:front")).toBeUndefined();
  });
});
