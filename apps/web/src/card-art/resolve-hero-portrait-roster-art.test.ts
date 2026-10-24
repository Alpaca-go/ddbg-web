import { describe, expect, it } from "vitest";
import {
  heroHasPortraitRoster,
  heroPortraitRosterRelPath,
  heroPortraitRosterUrl,
} from "./resolve-hero-portrait-roster-art";

describe("hero portrait roster paths", () => {
  it("maps known heroes to Kyries roster PNGs", () => {
    expect(heroPortraitRosterRelPath("CRUSADER")).toBe("crusader/crusader_portrait_roster.png");
    expect(heroPortraitRosterUrl("VESTAL")).toBe(
      "/hero-skill-icons/vestal/vestal_portrait_roster.png",
    );
    expect(heroHasPortraitRoster("CRUSADER")).toBe(true);
    expect(heroHasPortraitRoster("JESTER")).toBe(false);
  });
});
