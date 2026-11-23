import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../../packages/data/src/normalize/write";
import {
  collectVerifiedFields,
  parseHeroSkillWithEngine,
  parseHeroStatWithEngine,
} from "./hero-skills-review-parse";
import type { HeroSkillCardView } from "@ddbg/engine";

const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

describe("review engine parse wrappers", () => {
  it("uses resolveHeroSkillEffects for Leper Chop I (not a fake parser)", () => {
    const card = clean<HeroSkillCardView>(
      data.hero_skill.cards.find((c) => c.id === "hero_skill:warrens:h14:p274")!,
    );
    const parsed = parseHeroSkillWithEngine(card);
    expect(parsed.source).toBe("resolveHeroSkillEffects");
    expect(parsed.rolls).toHaveLength(10);
    expect(parsed.rolls.every((r) => r.roll >= 1 && r.roll <= 10)).toBe(true);
  });

  it("uses readHeroPassiveDefence for Leper I stat", () => {
    const stat = clean(
      data.hero_stat.cards.find((c) => c.id === "hero_stat:warrens:h14:p028:front")!,
    );
    const parsed = parseHeroStatWithEngine(stat as never);
    expect(parsed.source).toBe("readHeroPassiveDefence");
    expect(parsed.life).toBeTypeOf("number");
    expect(parsed.attributesVerified).toBe(true);
  });

  it("collects verified_* keys only", () => {
    const card = clean<Record<string, unknown>>(
      data.hero_skill.cards.find((c) => c.id === "hero_skill:warrens:h14:p280")!,
    );
    const verified = collectVerifiedFields(card);
    expect(Object.keys(verified).every((k) => k.startsWith("verified_"))).toBe(true);
    expect(verified).toHaveProperty("verified_status_effects");
  });
});
