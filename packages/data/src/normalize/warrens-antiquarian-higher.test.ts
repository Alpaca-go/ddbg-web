import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Warrens Antiquarian 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    { id: "hero_skill:p302", line: 0, sig: "{range} Self" },
    { id: "hero_skill:p302", line: 1, sig: "{self_effects} Self {buff} 3t, {shuffle} Push 2" },
    { id: "hero_skill:p311", line: 1, sig: "{self_effects} Self {buff} 2t" },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
  const fortify = data.hero_skill.cards.find((c) => c.id === "hero_skill:p308")!;
  expect(
    fortify.stats_line?.some((s) => s.type === "icon" && s.icon.key === "damage_or_heal_combined_marker"),
  ).toBe(true);
});
