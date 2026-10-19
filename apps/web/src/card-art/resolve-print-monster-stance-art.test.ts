import { describe, expect, it } from "vitest";
import printMap from "./monster-stance-print-art-map.json";
import {
  cachedPrintMonsterStanceUrl,
  listMonsterStanceSlots,
  lookupMonsterStanceBoard,
  lookupMonsterStanceSlot,
  monsterStanceArtMapMeta,
} from "./resolve-print-monster-stance-art";

describe("print monster stance art map", () => {
  it("exposes front/back trimbox boards without crop rectangles", () => {
    const meta = monsterStanceArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-monster-stance-art-map.v1");
    expect(meta.boardCount).toBe(2);
    expect(meta.stanceSlotCount).toBe(4);
    const front = lookupMonsterStanceBoard("front");
    const back = lookupMonsterStanceBoard("back");
    expect(front?.cropMethod).toBe("trimbox");
    expect(back?.primaryPdf).toContain("Monster_Stance_BACK");
    for (const board of printMap.boards) {
      expect(board).not.toHaveProperty("cropRect");
      expect(board.pngRel).toMatch(/^png\//);
      expect(cachedPrintMonsterStanceUrl(board)).toBe(`/print-card-art/${board.pngRel}`);
    }
  });

  it("lists four stance labels for UI overlays only", () => {
    expect(listMonsterStanceSlots().map((s) => s.stance)).toEqual([
      "aggressive",
      "defensive",
      "ranged",
      "support",
    ]);
    expect(lookupMonsterStanceSlot("ranged")?.labelZh).toBe("远程");
  });
});
