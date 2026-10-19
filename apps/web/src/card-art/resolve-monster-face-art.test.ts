import { describe, expect, it } from "vitest";
import monsterMap from "./monster-face-art-map.json";
import {
  lookupMonsterFace,
  monsterFaceArtMapMeta,
  monsterFaceSprite,
} from "./resolve-monster-face-art";
import { atlasBackgroundPosition, cachedFaceSheetUrl } from "./resolve-card-art";

describe("TTS monster face art map", () => {
  it("maps core-box monsters with atlas metadata from committed JSON only", () => {
    const meta = monsterFaceArtMapMeta();
    expect(meta.schema).toBe("ddbg.tts-monster-face-art-map.v1");
    expect(meta.cardCount).toBeGreaterThanOrEqual(30);
    expect(meta.atlasCount).toBe(3);
    for (const card of monsterMap.cards) {
      const atlas = monsterMap.atlases[card.deckId as keyof typeof monsterMap.atlases];
      expect(atlas).toBeDefined();
      expect(card.faceUrl).toBe(atlas!.faceUrl);
      expect(card.cell).toBeGreaterThanOrEqual(0);
      expect(card.cell).toBeLessThan(atlas!.numWidth * atlas!.numHeight);
    }
  });

  it("maps Bone Soldier and battle-pool Gargoyle to deck 461 cells", () => {
    const bone = lookupMonsterFace("monster_medium:p001");
    expect(bone).toMatchObject({
      name: "Bone Soldier",
      deckId: "461",
      cell: 0,
      cellSource: "tts_nickname_unique",
    });
    const gargoyle = lookupMonsterFace("monster_medium:p050");
    expect(gargoyle).toMatchObject({
      name: "Gargoyle",
      deckId: "461",
      cell: 49,
    });
    expect(cachedFaceSheetUrl(bone!)).toBe("/tts-card-art/face-461.png");
    expect(monsterFaceSprite(gargoyle!).backgroundPosition).toBe(
      atlasBackgroundPosition(gargoyle!),
    );
  });

  it("lists pending items and returns undefined for unmapped ids", () => {
    expect(monsterFaceArtMapMeta().pendingConfirmation.length).toBeGreaterThan(0);
    expect(lookupMonsterFace("monster_medium:p089")).toBeUndefined();
  });
});
