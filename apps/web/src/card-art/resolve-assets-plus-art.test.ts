import { describe, expect, it } from "vitest";
import { embarkPositionStanceGlowTier } from "./resolve-assets-plus-art";

describe("embark position stance glow", () => {
  it("maps lit stance count to glow tier", () => {
    expect(embarkPositionStanceGlowTier(0)).toBe(0);
    expect(embarkPositionStanceGlowTier(1)).toBe(0);
    expect(embarkPositionStanceGlowTier(2)).toBe(2);
    expect(embarkPositionStanceGlowTier(3)).toBe(3);
    expect(embarkPositionStanceGlowTier(4)).toBe(3);
  });
});
