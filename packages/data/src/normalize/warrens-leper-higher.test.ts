import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Purge II/III 最小覆盖（Buff 去重 + III stats 伤害）", () => {
  const data = loadNormalizedCorebox();
  for (const id of ["hero_skill:p281", "hero_skill:p282"] as const) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[0]!)).toBe("{self_effects} Self {buff} 2t");
    expect(card.verified_status_effects).toEqual([
      expect.objectContaining({ scope: "self", kind: "buff", duration: 2 }),
    ]);
  }
  const purge3 = data.hero_skill.cards.find((c) => c.id === "hero_skill:p282")!;
  expect(
    purge3.stats_line?.some(
      (s) => s.type === "icon" && s.icon.key === "damage",
    ),
  ).toBe(true);
  const revenge = data.hero_skill.cards.find((c) => c.id === "hero_skill:p284")!;
  expect(lineSignature(revenge.effect_lines[0]!)).toContain("{heal}");
});
