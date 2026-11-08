import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

/** Musketeer II/III 14 张。 */
const MSK_II_III_IDS = [
  "hero_skill:musketeer:p002",
  "hero_skill:musketeer:p003",
  "hero_skill:musketeer:p005",
  "hero_skill:musketeer:p006",
  "hero_skill:musketeer:p008",
  "hero_skill:musketeer:p009",
  "hero_skill:musketeer:p011",
  "hero_skill:musketeer:p012",
  "hero_skill:musketeer:p014",
  "hero_skill:musketeer:p015",
  "hero_skill:musketeer:p017",
  "hero_skill:musketeer:p018",
  "hero_skill:musketeer:p020",
  "hero_skill:musketeer:p021",
] as const;

const data = loadNormalizedCorebox();
const mskHigherCards = data.hero_skill.cards.filter((card) =>
  (MSK_II_III_IDS as readonly string[]).includes(card.id),
);
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it("R-200：Musketeer II/III 审计集合 14 张", () => {
  expect(mskHigherCards.map((c) => c.id).sort()).toEqual([...MSK_II_III_IDS].sort());
});

type MskCard = HeroSkillCardView & { readonly name: string; readonly level: number };

function combatFor(card: MskCard) {
  const self = heroSkillUsesSelfTarget(card);
  const aimed = card.name === "Aimed Shot";
  const patch = card.name === "Patch Up";
  const skeet = card.name === "Skeet Shot";
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  return {
    actor: { id: "h", wounds: 5, stress: 3, form: "human" as const },
    allies: patch
      ? [{ id: "a1", side: "hero" as const, wounds: 5, stress: 3, dodge: 0, statusStacks: [] }]
      : skeet
        ? [{ id: "a1", side: "hero" as const, wounds: 5, stress: 3, dodge: 0, statusStacks: [] }]
        : [],
    target: {
      id: self || patch ? (patch ? "a1" : "h") : "t",
      side: self || patch ? ("hero" as const) : ("monster" as const),
      wounds: 5,
      dodge: aimed ? 0 : 5,
      statusStacks: aimed ? [{ kind: "mark" as const, remaining: 2 }] : [],
      ...(self || patch ? { stress: 3 } : {}),
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
    targetsInArea:
      targets.kind === "exact"
        ? targets.max
        : targets.kind === "hero_or_monster"
          ? 1
          : 1,
  };
}

it.each(mskHigherCards)("$id $name：Musketeer d10 审计", (raw) => {
  const card = clean<MskCard>(raw);
  const combat = combatFor(card);
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    expect(r.resolution.status, `${raw.id}: ${r.resolution.reason}`).toBe("resolved");
    expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    expect(resolveHeroSkillEffects(card, combat, roll)).toEqual(r);
  }
});
