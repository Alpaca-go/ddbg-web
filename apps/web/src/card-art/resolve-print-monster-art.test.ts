import { describe, expect, it } from "vitest";
import printMap from "./monster-print-art-map.json";
import {
  cachedPrintMonsterUrl,
  lookupPrintMonsterFace,
  printMonsterArtMapMeta,
} from "./resolve-print-monster-art";

describe("print monster art map (Kyries CSV)", () => {
  it("covers 72 reviewed core-box monsters with pngRel under png/", () => {
    const meta = printMonsterArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-monster-art-map.v1");
    expect(meta.cardCount).toBe(72);
    expect(printMap.cards.length).toBe(72);
    for (const card of printMap.cards) {
      expect(card.pngRel).toMatch(/^png\/.+\.png$/);
      expect(card.reviewVerdict).toBe("ok");
      expect(lookupPrintMonsterFace(card.id)?.pngRel).toBe(card.pngRel);
      expect(cachedPrintMonsterUrl(card)).toBe(`/print-card-art/${card.pngRel}`);
    }
  });

  it("binds Cultist Acolyte I to reviewed FRONT p021", () => {
    const acolyte = lookupPrintMonsterFace("monster_medium:p021");
    expect(acolyte?.name).toBe("Cultist Acolyte");
    expect(acolyte?.printPage).toBe(21);
    expect(acolyte?.pngRel).toContain("_p021.png");
  });

  it("lists ADD_014 medium ids outside CSV scope", () => {
    const meta = printMonsterArtMapMeta();
    expect(meta.uncoveredEngineIds).toEqual([
      "monster_medium:ADD_014:p001",
      "monster_medium:ADD_014:p003",
    ]);
  });
});
