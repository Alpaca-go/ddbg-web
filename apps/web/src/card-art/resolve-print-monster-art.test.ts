import { describe, expect, it } from "vitest";
import printMap from "./monster-print-art-map.json";
import {
  cachedPrintMonsterUrl,
  lookupPrintMonsterFace,
  printMonsterArtMapMeta,
} from "./resolve-print-monster-art";

describe("print monster art map (Kyries CSV)", () => {
  it("covers reviewed CSV monsters plus ADD_014 aliases with pngRel under png/", () => {
    const meta = printMonsterArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-monster-art-map.v1");
    expect(meta.cardCount).toBe(74);
    expect(printMap.cards.length).toBe(74);
    expect(meta.uncoveredEngineIds).toEqual([]);
    for (const card of printMap.cards) {
      expect(card.pngRel).toMatch(/^png\/.+\.png$/);
      expect(["ok", "alias"]).toContain(card.reviewVerdict);
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

  it("resolves ADD_014 Perfect / Imperfect Reflection to base p106 / p109 PNG", () => {
    const perfectBase = lookupPrintMonsterFace("monster_medium:p106");
    const imperfectBase = lookupPrintMonsterFace("monster_medium:p109");
    expect(perfectBase?.pngRel).toBeTruthy();
    expect(imperfectBase?.pngRel).toBeTruthy();

    const perfectAdd = lookupPrintMonsterFace("monster_medium:ADD_014:p001");
    const imperfectAdd = lookupPrintMonsterFace("monster_medium:ADD_014:p003");
    expect(perfectAdd?.pngRel).toBe(perfectBase?.pngRel);
    expect(imperfectAdd?.pngRel).toBe(imperfectBase?.pngRel);
    expect(perfectAdd?.reviewVerdict).toBe("alias");
    expect(imperfectAdd?.reviewVerdict).toBe("alias");
  });
});
