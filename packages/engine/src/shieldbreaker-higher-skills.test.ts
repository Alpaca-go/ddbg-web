import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

/** Weald Shieldbreaker II/III 14 张。 */
const SB_II_III_IDS = [
  "hero_skill:p317",
  "hero_skill:p318",
  "hero_skill:p320",
  "hero_skill:p321",
  "hero_skill:p323",
  "hero_skill:p324",
  "hero_skill:p326",
  "hero_skill:p327",
  "hero_skill:p329",
  "hero_skill:p330",
  "hero_skill:p332",
  "hero_skill:p333",
  "hero_skill:p335",
  "hero_skill:p336",
] as const;

const data = loadNormalizedCorebox();
const sbHigherCards = data.hero_skill.cards.filter((card) =>
  (SB_II_III_IDS as readonly string[]).includes(card.id),
);
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it("R-200：Shieldbreaker II/III 审计集合 14 张", () => {
  expect(sbHigherCards.map((c) => c.id).sort()).toEqual([...SB_II_III_IDS].sort());
});

type SbCard = HeroSkillCardView & { readonly name: string; readonly level: number };

function combatFor(card: SbCard) {
  const self = heroSkillUsesSelfTarget(card);
  const serpentIii = card.id === "hero_skill:p336";
  const captivate = card.name === "Captivate";
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  return {
    actor: { id: "h", wounds: 5, stress: 3, form: "human" as const },
    allies: serpentIii
      ? [{ id: "a1", side: "hero" as const, wounds: 5, stress: 3, dodge: 0, statusStacks: [] }]
      : [],
    target: {
      id: self ? "h" : serpentIii ? "a1" : "t",
      side: self || serpentIii ? ("hero" as const) : ("monster" as const),
      wounds: 5,
      dodge: 0,
      statusStacks: captivate ? [{ kind: "mark" as const, remaining: 2 }] : [],
      ...(self || serpentIii ? { stress: 3 } : {}),
      monsterTypeTags: ["Human", "Eldritch", "Unholy"],
    },
    light: 4,
    shuffleChoice: "push" as const,
    areaDistance:
      range.kind === "exact"
        ? range.distance
        : range.kind === "interval"
          ? range.min
          : 0,
    targetsInArea: targets.kind === "exact" ? targets.max : 1,
  };
}

it.each(sbHigherCards)("$id $name：Shieldbreaker d10 审计", (raw) => {
  const card = clean<SbCard>(raw);
  const combat = combatFor(card);
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    expect(r.resolution.status, r.resolution.reason ?? raw.id).toBe("resolved");
    expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    expect(resolveHeroSkillEffects(card, combat, roll)).toEqual(r);
  }
});
