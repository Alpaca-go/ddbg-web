import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Cove Flagellant 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    { id: "hero_skill:p261", line: 1, sig: "{target_effects}{stun} 4t" },
    { id: "hero_skill:p268", line: 0, sig: "{range} Self" },
    { id: "hero_skill:p265", line: 0, sig: "{range} 1 {target_hero}" },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
});
