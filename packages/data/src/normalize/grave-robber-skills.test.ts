import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedHeroDamage } from "./verified-hero-damage";
import { attachVerifiedHeroLayout } from "./verified-hero-layout";
import { attachVerifiedHeroRanges } from "./verified-hero-ranges";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";

const cards = loadNormalizedCorebox().hero_skill.cards;

it("Poison Dart I / Shadow Fade I / Toxin Trickery I 完整状态黄金值；II/III 不外推", () => {
  expect(cards.find((c) => c.id === "hero_skill:p184")!.verified_status_effects).toEqual([
    { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "blight", amount: 2, duration: 3 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:p178")!.verified_status_effects).toEqual([
    { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "buff", duration: 2 },
  ]);
  expect(cards.find((c) => c.id === "hero_skill:p187")!.verified_status_effects).toEqual([
    { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "buff", duration: 2 },
  ]);
  for (const id of ["hero_skill:p185", "hero_skill:p179", "hero_skill:p188"] as const)
    expect(cards.find((c) => c.id === id)!.verified_status_effects).toBeUndefined();
  expect(attachVerifiedHeroStatuses(cards)).toEqual(cards);
});

it("Throw Dagger I 同框双条件与 1–2 射程；Lunge I 对 Blight +2；区间原 numeric 仍 null", () => {
  const dagger = cards.find((c) => c.id === "hero_skill:p181")!;
  expect(dagger.verified_damage_bonuses).toEqual([
    { lineIndex: 0, amount: 1, condition: "blighted", source: "print_front" },
    { lineIndex: 1, amount: 2, condition: "marked", source: "print_front" },
  ]);
  expect(dagger.verified_range).toEqual({ min: 1, max: 2, source: "print_front" });
  expect(dagger.unlabeled_numbers.find((n) => n.text === "1-2")?.numeric).toBeNull();
  const lunge = cards.find((c) => c.id === "hero_skill:p172")!;
  expect(lunge.verified_damage_bonus).toEqual({
    lineIndex: 1,
    amount: 2,
    condition: "blighted",
    source: "print_front",
  });
  expect(cards.find((c) => c.id === "hero_skill:p184")!.verified_range).toEqual({
    min: 1,
    max: 2,
    source: "print_front",
  });
  // 幂等：对已注解卡再挂载一次应得到相同注解。
  expect(attachVerifiedHeroDamage(cards)).toEqual(cards);
  expect(attachVerifiedHeroRanges(cards)).toEqual(cards);
  expect(attachVerifiedHeroLayout([dagger])).toEqual([dagger]);
});

it("Throw Dagger / Lunge 身份或效果行漂移拒绝；Pick to the Face / Flashing Daggers 无条件伤注解", () => {
  const dagger = cards.find((c) => c.id === "hero_skill:p181")!;
  expect(() =>
    attachVerifiedHeroLayout([{ ...dagger, hero: "BOUNTY HUNTER" } as typeof dagger]),
  ).toThrow(/Throw Dagger/);
  expect(() =>
    attachVerifiedHeroDamage([{ ...dagger, effect_lines: dagger.effect_lines.slice(0, 1) }]),
  ).toThrow();
  for (const id of ["hero_skill:p169", "hero_skill:p175"] as const) {
    const card = cards.find((c) => c.id === id)!;
    expect(card.verified_damage_bonus).toBeUndefined();
    expect(card.verified_damage_bonuses).toBeUndefined();
    expect(card.verified_status_effects).toBeUndefined();
  }
});
