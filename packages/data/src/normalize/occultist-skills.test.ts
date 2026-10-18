import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedHeroDamage } from "./verified-hero-damage";
import { attachVerifiedHeroRanges } from "./verified-hero-ranges";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";

const cards = loadNormalizedCorebox().hero_skill.cards;

it("Occ I：Sacrificial Stab / Abyssal Artillery Eldritch +1；II/III 不外推", () => {
  for (const id of ["hero_skill:p190", "hero_skill:p193"] as const) {
    expect(cards.find((c) => c.id === id)!.verified_damage_bonus).toEqual({
      lineIndex: 0,
      amount: 1,
      condition: "eldritch",
      source: "print_front",
    });
  }
  for (const id of ["hero_skill:p191", "hero_skill:p194"] as const)
    expect(cards.find((c) => c.id === id)!.verified_damage_bonus).toBeUndefined();
  expect(attachVerifiedHeroDamage(cards)).toEqual(cards);
});

it("Occ I：Weakening Curse / Wyrd / Hex / Hands 完整状态与区间；Daemon Pull 无状态注解", () => {
  expect(cards.find((c) => c.id === "hero_skill:p196")!.verified_status_effects).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "debuff", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:p199")!.verified_status_effects).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "bleed", amount: 1, duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:p202")!.verified_status_effects).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "mark", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:p205")!.verified_status_effects).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:p208")!.verified_status_effects).toBeUndefined();
  expect(cards.find((c) => c.id === "hero_skill:p196")!.verified_range).toEqual({
    min: 1,
    max: 2,
    source: "print_front",
  });
  expect(cards.find((c) => c.id === "hero_skill:p199")!.verified_range).toEqual({
    min: 0,
    max: 1,
    source: "print_front",
  });
  expect(cards.find((c) => c.id === "hero_skill:p202")!.verified_range).toEqual({
    min: 1,
    max: 2,
    source: "print_front",
  });
  expect(attachVerifiedHeroStatuses(cards)).toEqual(cards);
  expect(attachVerifiedHeroRanges(cards)).toEqual(cards);
});

it("Occ I 身份或效果行漂移拒绝", () => {
  const stab = cards.find((c) => c.id === "hero_skill:p190")!;
  expect(() =>
    attachVerifiedHeroDamage([{ ...stab, hero: "BOUNTY HUNTER" } as typeof stab]),
  ).toThrow(/Sacrificial Stab|p190/);
  const drifted = cards.map((c) =>
    c.id === "hero_skill:p196" ? ({ ...c, hero: "PLAGUE DOCTOR" } as typeof c) : c,
  );
  expect(() => attachVerifiedHeroStatuses(drifted)).toThrow(/Weakening Curse|p196/);
});
