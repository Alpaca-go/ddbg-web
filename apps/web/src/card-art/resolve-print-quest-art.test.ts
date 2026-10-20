import { describe, expect, it } from "vitest";
import printMap from "./quest-print-art-map.json";
import {
  cachedPrintQuestUrl,
  lookupPrintQuestFace,
  printQuestArtMapMeta,
} from "./resolve-print-quest-art";

const ENABLED = ["quest:p001", "quest:p002", "quest:p003", "quest:p007", "quest:p008"] as const;

describe("print quest art map", () => {
  it("maps only basic-quests enabled ids with TrimBox geometry", () => {
    const meta = printQuestArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-quest-art-map.v1");
    expect(meta.cardCount).toBe(5);
    expect(meta.enabledQuestIds).toEqual([...ENABLED]);
    expect(meta.trimBoxPt).toMatchObject({ widthPt: 198.43, heightPt: 340.16 });
    expect(meta.pendingConfirmation).toHaveLength(14);
    for (const card of printMap.cards) {
      expect(ENABLED).toContain(card.id);
      const page = Number(card.id.replace("quest:p", ""));
      expect(card.faces.front.printPage).toBe(page);
      expect(card.faces.front.cropMethod).toBe("trimbox");
      expect(cachedPrintQuestUrl(card.faces.front)).toBe(
        `/print-card-art/${card.faces.front.pngRel}`,
      );
    }
  });

  it("binds Scout Ahead I to FRONT p001", () => {
    const scout = lookupPrintQuestFace("quest:p001");
    expect(scout?.name).toBe("Scout Ahead I");
    expect(scout?.faces.front.printPage).toBe(1);
    expect(scout?.faces.front.textSnippet).toContain("Scout Ahead");
  });

  it("returns undefined for unmapped quest pages", () => {
    expect(lookupPrintQuestFace("quest:p004")).toBeUndefined();
  });
});
