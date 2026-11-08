import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Houndmaster 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    { id: "hero_skill:p338", line: 0, sig: "{self_effects} Self {mark} 3t" },
    { id: "hero_skill:p341", line: 0, sig: "{target_effects} 2 {bleed} 2t" },
    { id: "hero_skill:p344", line: 0, sig: "{target_effects} {mark} 3t, {debuff} 2t" },
    { id: "hero_skill:p347", line: 1, sig: "{self_effects} Self {stress} -1" },
    { id: "hero_skill:p350", line: 1, sig: "{self_effects} Self {protection} 3t" },
    { id: "hero_skill:p356", line: 0, sig: "{target_effects} {stun} 1t" },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
  const havoc = data.hero_skill.cards.find((c) => c.id === "hero_skill:p348")!;
  expect(havoc.verified_effect_line_receipts).toEqual([
    { lineIndex: 0, signature: "{stress}-1", source: "print_front" },
  ]);
  expect(havoc.verified_allies_stress).toBe(-1);
  expect(havoc.verified_self_stress).toMatchObject({ amount: -2, lineIndex: 1 });
});
