import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

/** Weald Houndmaster II/III 14 张（与 L1 技能族一一对应 L2/L3）。 */
const HM_II_III_IDS = [
  "hero_skill:p338",
  "hero_skill:p339",
  "hero_skill:p341",
  "hero_skill:p342",
  "hero_skill:p344",
  "hero_skill:p345",
  "hero_skill:p347",
  "hero_skill:p348",
  "hero_skill:p350",
  "hero_skill:p351",
  "hero_skill:p353",
  "hero_skill:p354",
  "hero_skill:p356",
  "hero_skill:p357",
] as const;

const data = loadNormalizedCorebox();
const hmHigherCards = data.hero_skill.cards.filter((card) =>
  (HM_II_III_IDS as readonly string[]).includes(card.id),
);
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it("R-200：Houndmaster II/III 审计集合 14 张", () => {
  expect(hmHigherCards.map((c) => c.id).sort()).toEqual([...HM_II_III_IDS].sort());
});

type HmCard = HeroSkillCardView & { readonly name: string; readonly level: number };

function combatFor(card: HmCard) {
  const self = heroSkillUsesSelfTarget(card);
  const cryHavoc = card.name === "Cry Havoc";
  const guardDog = card.name === "Guard Dog";
  const friendly =
    self ||
    guardDog ||
    cryHavoc ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  return {
    actor: { id: "h", wounds: 5, stress: 3, form: "human" as const },
    allies: cryHavoc
      ? card.level === 1
        ? [{ id: "a1", side: "hero" as const, wounds: 5, stress: 4, dodge: 0, statusStacks: [] }]
        : [
            { id: "a1", side: "hero" as const, wounds: 5, stress: 4, dodge: 0, statusStacks: [] },
            { id: "a2", side: "hero" as const, wounds: 5, stress: 5, dodge: 0, statusStacks: [] },
          ]
      : [],
    target: {
      id: self || guardDog ? "h" : cryHavoc ? "a1" : "t",
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
    targetsInArea:
      targets.kind === "exact" ? targets.max : cryHavoc ? (card.level === 1 ? 2 : 3) : 1,
  };
}

it.each(hmHigherCards)("$id $name：Houndmaster d10 审计", (raw) => {
  const card = clean<HmCard>(raw);
  const combat = combatFor(card);
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    expect(r.resolution.status, r.resolution.reason ?? raw.id).toBe("resolved");
    expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    expect(resolveHeroSkillEffects(card, combat, roll)).toEqual(r);
  }
});
