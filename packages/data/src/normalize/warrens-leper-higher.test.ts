import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";

it("R-200：Warrens Leper 高等级逐卡覆盖签名", () => {
  const data = loadNormalizedCorebox();
  const cases: Array<{ id: string; line: number; sig: string }> = [
    { id: "hero_skill:p281", line: 0, sig: "{self_effects} Self {buff} 2t" },
    { id: "hero_skill:p284", line: 0, sig: "{target_effects} {mark} 2t, {debuff} 2t" },
    { id: "hero_skill:p287", line: 1, sig: "{self_effects} Self {protection} 2t, {mark} 1t" },
    { id: "hero_skill:p290", line: 0, sig: "{self_effects} Self {heal} 9{stress}-1" },
    { id: "hero_skill:p293", line: 0, sig: "{self_effects} Self {mark} 2t" },
  ];
  for (const { id, line, sig } of cases) {
    const card = data.hero_skill.cards.find((c) => c.id === id)!;
    expect(lineSignature(card.effect_lines[line]!)).toBe(sig);
  }
  const intimidate = data.hero_skill.cards.find((c) => c.id === "hero_skill:p293")!;
  expect(intimidate.stats_line?.some((s) => s.type === "icon" && s.icon.key === "damage")).toBe(
    true,
  );
  expect(lineSignature(intimidate.effect_lines[1]!)).toBe("{target_effects} Ignores {protection}");
  expect(lineSignature(intimidate.effect_lines[2]!)).toBe("Ignores {guard}");
  expect(lineSignature(intimidate.effect_lines[3]!)).toBe("{target_effects} {debuff} 2t");
  const keys = intimidate.effect_lines.flatMap((line) =>
    line.filter((s) => s.type === "icon").map((s) => s.icon.key),
  );
  expect(keys).not.toContain("light");
});
