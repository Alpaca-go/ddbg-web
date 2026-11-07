import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

const LEPER_HIGHER = [
  "hero_skill:p281",
  "hero_skill:p282",
  "hero_skill:p284",
  "hero_skill:p285",
  "hero_skill:p287",
  "hero_skill:p288",
  "hero_skill:p290",
  "hero_skill:p291",
  "hero_skill:p293",
  "hero_skill:p294",
] as const;

it("R-200：Leper Warrens 高等级逐卡覆盖附在 normalized 产物上", () => {
  const data = loadNormalizedCorebox();
  for (const id of LEPER_HIGHER) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(card.hero).toBe("LEPER");
    expect(card.verification.unverified).toBe(false);
  }
  expect(data.hero_skill.cards.find((c) => c.id === "hero_skill:p282")!.stats_line).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "icon", icon: expect.objectContaining({ key: "damage" }) }),
    ]),
  );
  const revenge = data.hero_skill.cards.find((c) => c.id === "hero_skill:p284")!;
  expect(lineSignature(revenge.effect_lines[0]!)).toBe(
    "{target_effects} {mark} 2t, {debuff} 2t",
  );
  const solemnity = data.hero_skill.cards.find((c) => c.id === "hero_skill:p290")!;
  expect(solemnity.verified_self_heal).toEqual({ lineIndex: 1, amount: 9, source: "print_front" });
  expect(solemnity.verified_self_range).toBe(true);
});
