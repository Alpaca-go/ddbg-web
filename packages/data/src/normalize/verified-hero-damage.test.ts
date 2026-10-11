import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizedHeroSkillFileSchema } from "./schema";
import { attachVerifiedHeroDamage } from "./verified-hero-damage";
const cards = normalizedHeroSkillFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
  ),
).cards;
describe("逐卡复核条件伤害", () => {
  it("只给 p016 / p067 附已复核条件，不改变原 null 或推断同名高等级", () => {
    expect(
      attachVerifiedHeroDamage(cards)
        .filter((card) => card.verified_damage_bonus)
        .map((card) => card.id),
    ).toEqual(["hero_skill:p016", "hero_skill:p067"]);
    const lance = cards.find((card) => card.id === "hero_skill:p016")!;
    expect(lance.verified_damage_bonus).toEqual({
      lineIndex: 1,
      amount: 1,
      condition: "unholy",
      source: "print_front",
    });
    expect(lance.unlabeled_numbers.find((number) => number.text === "+1")?.numeric).toBeNull();
    expect(
      cards
        .find((card) => card.id === "hero_skill:p067")!
        .unlabeled_numbers.find((number) => number.text === "+2")?.numeric,
    ).toBeNull();
  });
  it("Holy Lance I 的页码、等级、卡名、条件和命名图标漂移均拒绝", () => {
    const card = cards.find((card) => card.id === "hero_skill:p016")!;
    for (const changed of [
      { ...card, pages: [17] },
      { ...card, level: 2 as const },
      { ...card, name: "Smite" },
      { ...card, verification: { ...card.verification, unverified: true } },
      { ...card, effect_lines: card.effect_lines.slice(0, 1) },
      {
        ...card,
        effect_lines: card.effect_lines.map((line) =>
          line.map((s) =>
            s.type === "text" ? { ...s, text: s.text.replace("Unholy", "Human") } : s,
          ),
        ),
      },
      {
        ...card,
        effect_lines: card.effect_lines.map((line) =>
          line.map((s) =>
            s.type === "icon" && s.icon.key === "damage"
              ? { ...s, icon: { ...s.icon, naming: "unverified" as const } }
              : s,
          ),
        ),
      },
    ])
      expect(() => attachVerifiedHeroDamage([changed])).toThrow();
  });
  it("未核实卡或效果行变化拒绝", () => {
    const card = cards.find((card) => card.id === "hero_skill:p067")!;
    expect(() => attachVerifiedHeroDamage([{ ...card, effect_lines: [] }])).toThrow();
    expect(() =>
      attachVerifiedHeroDamage([
        { ...card, verification: { ...card.verification, unverified: true } },
      ]),
    ).toThrow();
  });
});
