import { describe, expect, it } from "vitest";
import explorationMap from "./exploration-art-map.json";
import printMap from "./exploration-print-art-map.json";
import {
  cachedPrintExplorationUrl,
  cachedRasterUrl,
  explorationArtMapMeta,
  lookupQuestMapArt,
  lookupQuestMapArtByPage,
  lookupRoomCardArt,
  lookupRoomTokenArt,
  printExplorationArtMapMeta,
} from "./resolve-exploration-art";

describe("print exploration art map (Kyries CSV)", () => {
  it("covers 39 UI faces (25 room + 14 quest_map) with print URLs", () => {
    const meta = printExplorationArtMapMeta();
    expect(meta.schema).toBe("ddbg.print-exploration-art-map.v1");
    expect(meta.uiCardCount).toBe(39);
    const uiCards = printMap.cards.filter(
      (c) => c.category === "room" || c.category === "quest_map",
    );
    expect(uiCards).toHaveLength(39);
    for (const card of uiCards) {
      expect(card.pngRel).toMatch(/^png\/.+\.png$/);
      expect(card.reviewVerdict).toBe("ok");
      expect(cachedPrintExplorationUrl(card)).toBe(`/print-card-art/${card.pngRel}`);
    }
  });

  it("maps Ritual Chamber and Fanatic Room to print pages", () => {
    const ritual = lookupRoomCardArt("room:p001");
    expect(ritual).toMatchObject({
      name: "Ritual Chamber",
      page: 1,
      category: "room",
    });
    expect(ritual?.pngRel).toContain("_p001.png");
    const fanatic = lookupRoomCardArt("room:p013");
    expect(fanatic?.name).toBe("Fanatic Room");
    expect(fanatic?.pngRel).toContain("_p013.png");
  });

  it("resolves quest map by layout id and page with print pngRel", () => {
    const q1 = lookupQuestMapArt("quest_map:p001");
    expect(q1?.page).toBe(1);
    expect(q1?.pngRel).toMatch(/^png\/.+_p001\.png$/);
    expect(lookupQuestMapArtByPage(1)?.id).toBe("quest_map:p001");
    expect(cachedPrintExplorationUrl(q1!)).toMatch(/^\/print-card-art\/png\//);
    expect(lookupQuestMapArt("quest_map:missing")).toBeUndefined();
  });
});

describe("TTS exploration art map (room tokens only)", () => {
  it("covers 7 room token kinds from committed TTS URLs", () => {
    const meta = explorationArtMapMeta();
    expect(meta.ttsSchema).toBe("ddbg.tts-exploration-art-map.v1");
    expect(meta.printSchema).toBe("ddbg.print-exploration-art-map.v1");
    expect(meta.questMapCount).toBe(14);
    expect(meta.roomCardCount).toBe(25);
    expect(meta.roomTokenCount).toBe(7);
    for (const token of explorationMap.roomTokens) {
      expect(token.imageUrl).toMatch(/^https:\/\/steamusercontent/);
      expect(lookupRoomTokenArt(token.kind)?.cacheName).toBe(token.cacheName);
    }
    expect(cachedRasterUrl("token-empty")).toBe("/tts-card-art/token-empty.png");
  });

  it("records pending items for tokens and out-of-UI print rows", () => {
    expect(explorationArtMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(
      printExplorationArtMapMeta().pendingConfirmation.some((s) => s.includes("room_token")),
    ).toBe(true);
  });
});
