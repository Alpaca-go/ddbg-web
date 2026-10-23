import { describe, expect, it } from "vitest";
import {
  heroHasHeroToken,
  heroHeroTokenRelPath,
  heroHeroTokenUrl,
} from "./resolve-hero-token-art";

describe("hero token paths", () => {
  it("maps known heroes to Kyries hero_token PNGs", () => {
    expect(heroHeroTokenRelPath("CRUSADER")).toBe("crusader/crusader.hero_token.png");
    expect(heroHeroTokenUrl("HELLION")).toBe("/hero-skill-icons/hellion/hellion.hero_token.png");
    expect(heroHasHeroToken("OCCULTIST")).toBe(true);
    expect(heroHasHeroToken("BOUNTY HUNTER")).toBe(false);
    expect(heroHasHeroToken("GRAVE ROBBER")).toBe(false);
  });
});
