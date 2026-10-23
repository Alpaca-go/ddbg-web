import { describe, expect, it } from "vitest";
import {
  formalHeroAssetSlug,
  heroSkillIconRelPath,
  skillNameToIconSlug,
} from "./resolve-hero-skill-icon-art";

describe("hero skill icon paths", () => {
  it("maps crusader skills to Kyries asset filenames", () => {
    expect(formalHeroAssetSlug("CRUSADER")).toBe("crusader");
    expect(skillNameToIconSlug("Zealous Accusation")).toBe("zealous_accusation");
    expect(heroSkillIconRelPath("CRUSADER", "Holy Lance")).toBe("crusader/crusader.holy_lance.png");
    expect(heroSkillIconRelPath("CRUSADER", "Smite")).toBe("crusader/crusader.smite.png");
  });

  it("maps other heroes to hero.skill_slug PNGs", () => {
    expect(heroSkillIconRelPath("HIGHWAYMAN", "Wicked Slice")).toBe(
      "highwayman/highwayman.wicked_slice.png",
    );
    expect(heroSkillIconRelPath("HELLION", "Barbaric YAWP!")).toBe(
      "hellion/hellion.barbaric_yawp.png",
    );
    expect(heroSkillIconRelPath("OCCULTIST", "Daemon’s Pull")).toBe(
      "occultist/occultist.daemons_pull.png",
    );
  });
});
