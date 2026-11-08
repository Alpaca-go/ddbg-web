import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Shieldbreaker 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    { id: "hero_skill:p317", line: 0, sig: "{self_effects} Self {shuffle} Pull 1" },
    { id: "hero_skill:p320", line: 2, sig: "Ignores {guard}" },
    { id: "hero_skill:p323", line: 0, sig: "{self_effects} Self {shuffle} Push 1" },
    { id: "hero_skill:p326", line: 1, sig: "{target_effects}{debuff} 2t" },
    { id: "hero_skill:p331", line: 0, sig: "{target_effects}{damage}+2vs{stun}" },
    { id: "hero_skill:p335", line: 1, sig: "{self_effects} Self {protection} 3t, {shuffle} Pull 1" },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
  const impale = data.hero_skill.cards.find((c) => c.id === "hero_skill:p325")!;
  expect(
    impale.stats_line?.filter(
      (s) => s.type === "icon" && s.icon.key === "target_monster",
    ),
  ).toHaveLength(4);
});
