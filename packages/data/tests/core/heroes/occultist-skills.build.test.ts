import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../src/core/write";
import { applyHeroDamage } from "../../../src/core/heroes/annotations";
import { applyHeroRanges } from "../../../src/core/heroes/annotations";
import { applyHeroStatuses } from "../../../src/core/heroes/annotations";

const cards = loadNormalizedCorebox().hero_skill.cards;

it("Occ I：Sacrificial Stab / Abyssal Artillery Eldritch +1；II/III已有独立注解", () => {
  for (const id of ["hero_skill:core:h10:p190", "hero_skill:core:h10:p193"] as const) {
    expect(cards.find((c) => c.id === id)!.rules?.damage).toEqual({
      lineIndex: 0,
      amount: 1,
      condition: "eldritch",
      source: "print_front",
    });
  }
  for (const id of ["hero_skill:core:h10:p191", "hero_skill:core:h10:p194"] as const)
    expect(cards.find((c) => c.id === id)!.rules?.damage).toBeDefined();
  expect(applyHeroDamage(cards)).toEqual(cards);
});

it("Occ I：Weakening Curse / Wyrd / Hex / Hands 完整状态与区间；Daemon Pull 无状态注解", () => {
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p196")!.rules?.statuses).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "debuff", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p199")!.rules?.statuses).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "bleed", amount: 1, duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p202")!.rules?.statuses).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "mark", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p205")!.rules?.statuses).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p208")!.rules?.statuses).toBeUndefined();
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p196")!.rules?.range).toEqual({
    min: 1,
    max: 2,
    source: "print_front",
  });
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p199")!.rules?.range).toEqual({
    min: 0,
    max: 1,
    source: "print_front",
  });
  expect(cards.find((c) => c.id === "hero_skill:core:h10:p202")!.rules?.range).toEqual({
    min: 1,
    max: 2,
    source: "print_front",
  });
  expect(applyHeroStatuses(cards)).toEqual(cards);
  expect(applyHeroRanges(cards)).toEqual(cards);
});

it("Occ I 身份或效果行漂移拒绝", () => {
  const stab = cards.find((c) => c.id === "hero_skill:core:h10:p190")!;
  expect(() => applyHeroDamage([{ ...stab, hero: "BOUNTY HUNTER" } as typeof stab])).toThrow(
    /Sacrificial Stab|p190/,
  );
  const drifted = cards.map((c) =>
    c.id === "hero_skill:core:h10:p196" ? ({ ...c, hero: "PLAGUE DOCTOR" } as typeof c) : c,
  );
  expect(() => applyHeroStatuses(drifted)).toThrow(/Weakening Curse|p196/);
});
