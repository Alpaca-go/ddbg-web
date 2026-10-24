import { describe, expect, it } from "vitest";
import printMap from "./hero-stat-print-art-map.json";
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
      expect(lookupPrintHeroStatFace(face.id)?.pngRel).toBe(face.pngRel);
      expect(cachedPrintHeroStatUrl(face)).toBe(`/print-card-art/${face.pngRel}`);
    }
  });

  it("binds Crusader I to core Hero_STAT FRONT p1", () => {
    const crusader = lookupPrintHeroStatFace("hero_stat:p001:front");
    expect(crusader).toMatchObject({
      hero: "CRUSADER",
      dataStatus: "verified-data",
      printPage: 1,
    });
    expect(crusader?.pngRel).toContain("_p001.png");
  });

  it("marks Jester I as art-only until gameplay stat verified", () => {
    const jester = lookupPrintHeroStatFace("hero_stat:p011:front");
    expect(jester?.dataStatus).toBe("art-only");
    expect(jester?.hero).toBe("JESTER");
  });

  it("returns undefined for unknown ids", () => {
    expect(lookupPrintHeroStatFace("hero_stat:missing:front")).toBeUndefined();
  });
});
