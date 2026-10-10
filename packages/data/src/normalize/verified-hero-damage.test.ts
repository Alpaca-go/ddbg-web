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
  it("只给 p067 附明确 +2，不改变原 null 或推断同名高等级", () => {
    expect(
      attachVerifiedHeroDamage(cards)
        .filter((card) => card.verified_damage_bonus)
        .map((card) => card.id),
    ).toEqual(["hero_skill:p067"]);
    expect(
      cards
        .find((card) => card.id === "hero_skill:p067")!
        .unlabeled_numbers.find((number) => number.text === "+2")?.numeric,
    ).toBeNull();
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
