import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

const LEPER_II_III_IDS = [
  "hero_skill:p275",
  "hero_skill:p276",
  "hero_skill:p278",
  "hero_skill:p279",
  "hero_skill:p281",
  "hero_skill:p282",
  "hero_skill:p284",
  "hero_skill:p285",
  "hero_skill:p287",
  "hero_skill:p288",
  "hero_skill:p290",
  "hero_skill:p291",
  "hero_skill:p293",
  "hero_skill:p294",
] as const;

const data = loadNormalizedCorebox();
const leperHigherCards = data.hero_skill.cards.filter((card) =>
  (LEPER_II_III_IDS as readonly string[]).includes(card.id),
);
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it("R-200：Leper II/III 共 14 张纳入 d10 审计集合", () => {
  expect(leperHigherCards.map((c) => c.id).sort()).toEqual([...LEPER_II_III_IDS].sort());
});

it.each(leperHigherCards)("$id $name：14 张 Leper 高等级卡逐 d10 面结算所有效果行", (raw) => {
  const card = clean<HeroSkillCardView>(raw);
  const self = heroSkillUsesSelfTarget(card);
  const friendly =
    self ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  const combat = {
    actor: {
      id: "h",
      wounds: 5,
      stress: 3,
      form: "human" as const,
    },
    allies: [],
    target: {
      id: self ? "h" : "t",
      side: friendly ? ("hero" as const) : ("monster" as const),
      wounds: 5,
      ...(friendly ? { stress: 3 } : {}),
      dodge: 0,
      statusStacks: [],
      monsterTypeTags: ["Human", "Eldritch", "Unholy"],
    },
    light: 4,
    shuffleChoice: "push" as const,
    areaDistance:
      range.kind === "exact" ? range.distance : range.kind === "interval" ? range.min : 0,
    targetsInArea: targets.kind === "exact" ? targets.max : 1,
  };
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    expect(r.resolution.status, r.resolution.reason ?? raw.id).toBe("resolved");
    expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    expect(resolveHeroSkillEffects(card, combat, roll)).toEqual(r);
  }
});
