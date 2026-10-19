import { describe, expect, it } from "vitest";
import explorationMap from "./exploration-art-map.json";
import {
  cachedRasterUrl,
  explorationArtMapMeta,
  lookupQuestMapArt,
  lookupQuestMapArtByPage,
  lookupRoomCardArt,
  lookupRoomTokenArt,
  roomCardSprite,
} from "./resolve-exploration-art";

describe("TTS exploration art map", () => {
  it("covers 14 quest map pages and 7 room token kinds from committed URLs only", () => {
    const meta = explorationArtMapMeta();
    expect(meta.schema).toBe("ddbg.tts-exploration-art-map.v1");
    expect(meta.questMapCount).toBe(14);
    expect(meta.roomTokenCount).toBe(7);
    expect(meta.roomCardCount).toBe(12);
    for (const page of explorationMap.questMapPages) {
      expect(page.imageUrl).toMatch(/^https:\/\/steamusercontent/);
      expect(lookupQuestMapArt(page.id)?.cacheName).toBe(page.cacheName);
    }
    for (const token of explorationMap.roomTokens) {
      expect(lookupRoomTokenArt(token.kind)?.imageUrl).toBe(token.imageUrl);
    }
  });

  it("maps Ritual Chamber room card to deck 447 cell 13 (page + 12)", () => {
    const ritual = lookupRoomCardArt("room:p001");
    expect(ritual).toMatchObject({
      name: "Ritual Chamber",
      page: 1,
      deckId: "447",
      cell: 13,
      numWidth: 6,
      numHeight: 6,
    });
    const sprite = roomCardSprite(ritual!);
    expect(sprite.sheetUrl).toBe("/tts-card-art/face-447.png");
    expect(sprite.backgroundSize).toBe("600% 600%");
  });

  it("resolves quest map by layout id and page", () => {
    expect(lookupQuestMapArt("quest_map:p001")?.page).toBe(1);
    expect(lookupQuestMapArtByPage(1)?.id).toBe("quest_map:p001");
    expect(cachedRasterUrl("quest-map-p001")).toBe("/tts-card-art/quest-map-p001.png");
  });

  it("records pending items instead of inventing missing FaceURL", () => {
    expect(explorationArtMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(lookupRoomCardArt("room:p013")).toBeUndefined();
    expect(lookupQuestMapArt("quest_map:missing")).toBeUndefined();
  });
});
