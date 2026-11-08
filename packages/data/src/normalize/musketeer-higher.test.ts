import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Musketeer 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    {
      id: "hero_skill:musketeer:p002",
      line: 0,
      sig: "{target_effects} {damage} +5 vs {mark}",
    },
    {
      id: "hero_skill:musketeer:p007",
      line: 0,
      sig: "{target_effects} {debuff} 2t",
    },
    {
      id: "hero_skill:musketeer:p011",
      line: 0,
      sig: "{self_effects} Self {shuffle} Push 2",
    },
    {
      id: "hero_skill:musketeer:p017",
      line: 0,
      sig: "{self_effects} Self {buff} 2t",
    },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
  const patch = data.hero_skill.cards.find((c) => c.id === "hero_skill:musketeer:p017")!;
  expect(patch.stats_line?.some((s) => s.type === "icon" && s.icon.key === "heal")).toBe(true);
  const skeet = data.hero_skill.cards.find((c) => c.id === "hero_skill:musketeer:p020")!;
  expect(skeet.verified_rallying_flare).toBeDefined();
  const smoke = data.hero_skill.cards.find((c) => c.id === "hero_skill:musketeer:p005")!;
  expect(smoke.verified_status_effects?.[0]?.segmentIndex).toBe(2);
});
