import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

const FLAGELLANT_HIGHER_IDS = [
  "hero_skill:p254",
  "hero_skill:p255",
  "hero_skill:p257",
  "hero_skill:p258",
  "hero_skill:p260",
  "hero_skill:p261",
  "hero_skill:p263",
  "hero_skill:p264",
  "hero_skill:p266",
  "hero_skill:p267",
  "hero_skill:p269",
  "hero_skill:p270",
  "hero_skill:p272",
  "hero_skill:p273",
] as const;

const FLAGELLANT_L1_WASH = [
  "hero_skill:p253",
  "hero_skill:p256",
  "hero_skill:p259",
  "hero_skill:p262",
  "hero_skill:p265",
  "hero_skill:p268",
  "hero_skill:p271",
] as const;

const IDS = [...FLAGELLANT_HIGHER_IDS, ...FLAGELLANT_L1_WASH] as const;

const data = loadNormalizedCorebox();
const cards = data.hero_skill.cards.filter((card) => (IDS as readonly string[]).includes(card.id));
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

it("R-200：Flagellant 裁定族 21 张纳入 d10 审计集合", () => {
  expect(cards.map((c) => c.id).sort()).toEqual([...IDS].sort());
});

function combatFor(card: HeroSkillCardView, meta: { readonly name: string }) {
  const self = heroSkillUsesSelfTarget(card);
  const friendly =
    self ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card);
  let targets;
  try {
    targets = readPrintedTargets(card);
  } catch {
    targets = { kind: "exact" as const, max: 1 };
  }
  const isSuffer = meta.name === "Suffer";
  const isPunish = meta.name === "Punish";
  return {
    actor: {
      id: "h",
      wounds: 5,
      stress: 5,
      form: "human" as const,
      ...(isPunish ? { statusStacks: [{ kind: "bleed" as const, remaining: 2, amount: 2 }] } : {}),
    },
    allies: [{ id: "a1", wounds: 3, stress: 4 }],
    target: {
      id: self ? "h" : friendly ? "a1" : "m",
      side: (friendly ? "hero" : "monster") as "hero" | "monster",
      wounds: 5,
      ...(friendly || self ? { stress: 5 } : {}),
      dodge: 0,
      statusStacks: isSuffer
        ? [
            { kind: "bleed" as const, remaining: 2, amount: 2 },
            { kind: "blight" as const, remaining: 3, amount: 1 },
          ]
        : [],
      monsterTypeTags: ["Human", "Eldritch", "Unholy"],
    },
    light: 4,
    shuffleChoice: "push" as const,
    areaDistance:
      range.kind === "exact" ? range.distance : range.kind === "interval" ? range.min : 0,
    targetsInArea: targets.kind === "exact" ? targets.max : 1,
  };
}

it.each(cards)("$id $name：Flagellant 高等级卡 d10 全效果行（Q-172～175）", (raw) => {
  const card = clean<HeroSkillCardView>(raw);
  const combat = combatFor(card, { name: raw.name });
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    expect(r.resolution.status, r.resolution.reason ?? raw.id).toBe("resolved");
    expect(r.resolution.skipped).not.toContainEqual({ code: "effect_lines" });
  }
});
