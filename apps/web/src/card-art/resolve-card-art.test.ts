import { describe, expect, it } from "vitest";
import {
  atlasBackgroundPosition,
  atlasBackgroundSize,
  cachedFaceSheetUrl,
} from "./resolve-card-art";

describe("TTS atlas URL helpers (exploration / room decks)", () => {
  it("builds cached face sheet paths under /tts-card-art", () => {
    const entry = { deckId: "422" };
    expect(cachedFaceSheetUrl(entry)).toBe("/tts-card-art/face-422.png");
    expect(cachedFaceSheetUrl(entry, "jpg")).toBe("/tts-card-art/face-422.jpg");
  });

  it("computes sprite background position and size for a 10×7 atlas cell", () => {
    const entry = {
      faceUrl: "https://example.test/face.png",
      numWidth: 10,
      numHeight: 7,
      deckId: "422",
      cell: 21,
    };
    expect(atlasBackgroundSize(entry)).toBe("1000% 700%");
    expect(atlasBackgroundPosition(entry)).toBe(`${(1 / 9) * 100}% ${(2 / 6) * 100}%`);
  });
});
