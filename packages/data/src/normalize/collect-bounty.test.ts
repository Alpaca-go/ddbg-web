import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { normalizedHeroSkillCardSchema } from "./schema";
import { applyHeroLayouts } from "./hero-annotations";
import { applyHeroDamage } from "./hero-annotations";

const cards = loadNormalizedCorebox().hero_skill.cards;
const card = cards.find((c) => c.id === "hero_skill:core:h03:p043")!;

it("Collect Bounty I完整目标框两条件黄金值，继承原标记且高等级由独立注解覆盖", () => {
  expect(card.rules?.damageBonuses).toEqual([
    { lineIndex: 0, amount: 1, condition: "human", source: "print_front" },
    { lineIndex: 1, amount: 2, condition: "marked", source: "print_front" },
  ]);
  expect(card.rules?.damage).toBeUndefined();
  const marker = card.effect_lines[0]![0]!;
  expect(card.effect_lines[1]![0]).toEqual(marker);
  const rawLayout = {
    ...card,
    effect_lines: [card.effect_lines[0]!, card.effect_lines[1]!.slice(2)],
  };
  const before = structuredClone(rawLayout);
  expect(applyHeroLayouts([rawLayout])[0]).toEqual(card);
  expect(rawLayout).toEqual(before);
  expect(applyHeroDamage([card])[0]).toEqual(card);
  for (const text of ["+1", "+2"])
    expect(card.unlabeled_numbers.find((n) => n.text === text)?.numeric).toBeNull();
  for (const id of ["hero_skill:core:h03:p044", "hero_skill:core:h03:p045"])
    expect(cards.find((c) => c.id === id)!.rules?.damageBonuses).toBeDefined();
});

it("完整来源/版面漂移拒绝，schema拒绝重复或冲突伤害注解", () => {
  for (const mutate of [
    (c: typeof card) => {
      c.hero = "VESTAL";
    },
    (c: typeof card) => {
      c.level = 2;
    },
    (c: typeof card) => {
      c.pages = [44];
    },
    (c: typeof card) => {
      c.effect_lines.reverse();
    },
    (c: typeof card) => {
      c.effect_lines[1]!.push({ type: "text", text: "extra" });
    },
  ]) {
    const changed = structuredClone(card);
    mutate(changed);
    expect(() => applyHeroLayouts([changed])).toThrow();
    expect(() => applyHeroDamage([changed])).toThrow();
  }
  expect(
    normalizedHeroSkillCardSchema.safeParse({
      ...card,
      verified_damage_bonus: card.rules?.damageBonuses![0],
      verified_damage_bonuses: [card.rules?.damageBonuses![0]],
    }).success,
  ).toBe(false);
  expect(
    normalizedHeroSkillCardSchema.safeParse({
      ...card,
      verified_damage_bonuses: [card.rules?.damageBonuses![0], card.rules?.damageBonuses![0]],
    }).success,
  ).toBe(false);
});
