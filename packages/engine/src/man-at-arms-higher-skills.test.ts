import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

/** Cove Man-at-Arms II/III 14 张（Crush 以外）；Retribution/Defender 见 Q-176/Q-177。 */
const MAA_II_III_IDS = [
  "hero_skill:p233",
  "hero_skill:p234",
  "hero_skill:p236",
  "hero_skill:p237",
  "hero_skill:p239",
  "hero_skill:p240",
  "hero_skill:p242",
  "hero_skill:p243",
  "hero_skill:p245",
  "hero_skill:p246",
  "hero_skill:p248",
  "hero_skill:p249",
  "hero_skill:p251",
  "hero_skill:p252",
] as const;

const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it.each([250, 268, 346])("R-213：技能 p%i 命中只给选中目标减压", (page) => {
  const skill = clean<HeroSkillCardView>(
    data.hero_skill.cards.find((card) => card.id === `hero_skill:p${page}`),
  );
  const combat = {
    actor: { id: "actor", wounds: 0, stress: 4 },
    target: { id: "selected", side: "hero" as const, wounds: 0, stress: 4, dodge: 0 },
    allies: [{ id: "other", stress: 4 }],
    areaDistance: 1,
    targetsInArea: 1,
  };
  expect(resolveHeroSkillEffects(skill, combat, 5).resolution).toMatchObject({
    outcome: "hit",
    actorStress: 3,
    targetStress: 3,
    besideActorStress: null,
  });
  expect(
    resolveHeroSkillEffects(skill, { ...combat, target: { ...combat.target, dodge: 20 } }, 5)
      .resolution,
  ).toMatchObject({ outcome: "miss", actorStress: 3, targetStress: 4 });
});
const maaHigherCards = data.hero_skill.cards.filter((card) =>
  (MAA_II_III_IDS as readonly string[]).includes(card.id),
);

it("R-200：Man-at-Arms II/III 审计集合 14 张", () => {
  expect(maaHigherCards.map((c) => c.id).sort()).toEqual([...MAA_II_III_IDS].sort());
});

type MaaCard = HeroSkillCardView & { readonly name: string; readonly level: number };

function combatFor(card: MaaCard) {
  const self = heroSkillUsesSelfTarget(card);
  const isBolster = card.name === "Bolster";
  const friendly =
    self ||
    isBolster ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  return {
    actor: { id: "h", wounds: 5, stress: 3, form: "human" as const },
    allies: isBolster
      ? [{ id: "a1", side: "hero" as const, wounds: 5, stress: 4, dodge: 0, statusStacks: [] }]
      : [],
    target: {
      id: self ? "h" : isBolster ? "a1" : "t",
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
    targetsInArea: targets.kind === "exact" ? targets.max : isBolster && card.level >= 3 ? 3 : 1,
  };
}

it.each(maaHigherCards)("$id $name：Man-at-Arms d10 审计", (raw) => {
  const card = clean<MaaCard>(raw);
  const combat = combatFor(card);
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    expect(r.resolution.status, r.resolution.reason ?? raw.id).toBe("resolved");
    expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    expect(resolveHeroSkillEffects(card, combat, roll)).toEqual(r);
  }
});
