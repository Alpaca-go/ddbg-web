import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

const ANTIQUARIAN_II_III_IDS = [
  "hero_skill:p296",
  "hero_skill:p297",
  "hero_skill:p299",
  "hero_skill:p300",
  "hero_skill:p302",
  "hero_skill:p303",
  "hero_skill:p305",
  "hero_skill:p306",
  "hero_skill:p308",
  "hero_skill:p309",
  "hero_skill:p311",
  "hero_skill:p312",
  "hero_skill:p314",
  "hero_skill:p315",
] as const;

/** R-048：待 Kyries 裁定前审计保持红，不测绿。 */
const AUDIT_GREEN_IDS = new Set<string>([
  "hero_skill:p296",
  "hero_skill:p297",
  "hero_skill:p299",
  "hero_skill:p300",
  "hero_skill:p302",
  "hero_skill:p311",
]);

const data = loadNormalizedCorebox();
const antiquarianHigherCards = data.hero_skill.cards.filter((card) =>
  (ANTIQUARIAN_II_III_IDS as readonly string[]).includes(card.id),
);
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it("R-200：Antiquarian II/III 共 14 张纳入 d10 审计集合", () => {
  expect(antiquarianHigherCards.map((c) => c.id).sort()).toEqual(
    [...ANTIQUARIAN_II_III_IDS].sort(),
  );
});

function combatFor(card: HeroSkillCardView) {
  const self = heroSkillUsesSelfTarget(card);
  const friendly =
    self ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  return {
    actor: { id: "h", wounds: 5, stress: 3, form: "human" as const },
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
}

it.each(antiquarianHigherCards.filter((c) => AUDIT_GREEN_IDS.has(c.id)))(
  "$id $name：Antiquarian 高等级审计绿",
  (raw) => {
    const card = clean<HeroSkillCardView>(raw);
    const combat = combatFor(card);
    for (let roll = 1; roll <= 10; roll++) {
      const r = resolveHeroSkillEffects(card, combat, roll);
      expect(r.resolution.status, r.resolution.reason ?? raw.id).toBe("resolved");
      expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
    }
  },
);

it.each(antiquarianHigherCards.filter((c) => !AUDIT_GREEN_IDS.has(c.id)))(
  "$id $name：Antiquarian 高等级待 Q 裁定（审计红）",
  (raw) => {
    const card = clean<HeroSkillCardView>(raw);
    const combat = combatFor(card);
    const r = resolveHeroSkillEffects(card, combat, 5);
    const auditRed =
      r.resolution.status !== "resolved" ||
      r.resolution.skipped?.some((s) => s.code === "effect_lines");
    expect(auditRed).toBe(true);
  },
);
