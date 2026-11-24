import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../../src/shared/write";
import { lineSignature } from "../../../../src/core/heroes/annotations/shared";

it("R-200：Musketeer 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    {
      id: "hero_skill:musketeer:h18:p359",
      line: 0,
      sig: "{target_effects} {damage} +5 vs {mark}",
    },
    {
      id: "hero_skill:musketeer:h18:p364",
      line: 0,
      sig: "{target_effects} {mark} 2t",
    },
    {
      id: "hero_skill:musketeer:h18:p361",
      line: 0,
      sig: "{target_effects} {debuff} 1t",
    },
    {
      id: "hero_skill:musketeer:h18:p368",
      line: 0,
      sig: "{self_effects} Self {shuffle} Push 2",
    },
    {
      id: "hero_skill:musketeer:h18:p374",
      line: 0,
      sig: "{self_effects} Self {buff} 2t",
    },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
  const patch = data.hero_skill.cards.find((c) => c.id === "hero_skill:musketeer:h18:p374")!;
  expect(patch.stats_line?.some((s) => s.type === "icon" && s.icon.key === "heal")).toBe(true);
  const skeet = data.hero_skill.cards.find((c) => c.id === "hero_skill:musketeer:h18:p377")!;
  expect(skeet.rules?.rallyingFlare).toBeDefined();
  const smoke = data.hero_skill.cards.find((c) => c.id === "hero_skill:musketeer:h18:p362")!;
  expect(smoke.rules?.statuses?.[0]?.segmentIndex).toBe(2);
});
