import { describe, expect, it } from "vitest";
import { basicQuests } from "../../../../packages/data/src/basic-quests";
import printMap from "./quest-print-art-map.json";
import {
  cachedPrintQuestUrl,
  lookupPrintQuestFace,
  printQuestArtMapMeta,
} from "./resolve-print-quest-art";

const ENABLED = printMap.source.enabledQuestIds;
const ART_ONLY = printMap.source.artOnlyQuestIds;

const basicQuestIds = new Set<string>(basicQuests.map((q) => q.id));

describe("print quest art map", () => {
  it("maps all 19 print pages with TrimBox geometry", () => {
    const meta = printQuestArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-quest-art-map.v1");
    expect(meta.cardCount).toBe(19);
    expect(meta.enabledQuestIds).toEqual([...ENABLED]);
    expect(meta.artOnlyQuestIds).toEqual([...ART_ONLY]);
    expect(meta.trimBoxPt).toMatchObject({ widthPt: 198.43, heightPt: 340.16 });
    expect(meta.pendingConfirmation).toHaveLength(0);
    expect(printMap.cards).toHaveLength(19);

    const enabledCards = printMap.cards.filter((c) => c.status === "enabled");
    const artOnlyCards = printMap.cards.filter((c) => c.status === "art-only");
    expect(enabledCards).toHaveLength(ENABLED.length);
    expect(artOnlyCards).toHaveLength(ART_ONLY.length);

    for (const card of printMap.cards) {
      expect(lookupPrintQuestFace(card.id)).toBeDefined();
      const page = Number(card.id.replace("quest:p", ""));
      expect(card.faces.front.printPage).toBe(page);
      expect(card.faces.front.cropMethod).toBe("trimbox");
      expect(cachedPrintQuestUrl(card.faces.front)).toBe(
        `/print-card-art/${card.faces.front.pngRel}`,
      );
      if (card.status === "enabled") {
        expect(ENABLED).toContain(card.id);
        expect(basicQuestIds.has(card.id)).toBe(true);
      } else {
        expect(ART_ONLY).toContain(card.id);
        expect(basicQuestIds.has(card.id)).toBe(false);
      }
    }
  });

  it("binds Scout Ahead I to FRONT p001", () => {
    const scout = lookupPrintQuestFace("quest:p001");
    expect(scout?.name).toBe("Scout Ahead I");
    expect(scout?.status).toBe("enabled");
    expect(scout?.faces.front.printPage).toBe(1);
    expect(scout?.faces.front.textSnippet).toContain("Scout Ahead");
  });

  it("enables Dem Bones I with basic-quests entry", () => {
    const demBones = lookupPrintQuestFace("quest:p004");
    expect(demBones?.name).toBe("Dem Bones I");
    expect(demBones?.status).toBe("enabled");
    expect(basicQuestIds.has("quest:p004")).toBe(true);
  });

  it("enables Forward Camps III with basic-quests entry (data-pool-only, R-112)", () => {
    const forward = lookupPrintQuestFace("quest:p012");
    expect(forward?.name).toBe("Forward Camps III");
    expect(forward?.status).toBe("enabled");
    expect(basicQuestIds.has("quest:p012")).toBe(true);
  });
});
