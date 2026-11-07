import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

/** Kyries 已确认、可按核心模式接线的 6 张（Chop/Hew II/III + Purge II/III）。 */
const LEPER_AUDIT_GREEN = [
  "hero_skill:p275",
  "hero_skill:p276",
  "hero_skill:p278",
  "hero_skill:p279",
  "hero_skill:p281",
  "hero_skill:p282",
] as const;

/** Q-163～Q-166 未收口：禁止为测绿猜效果，审计允许红。 */
const LEPER_AUDIT_PENDING_Q = [
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
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));

function auditCard(raw: HeroSkillCardView) {
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
  const failures: string[] = [];
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    if (r.resolution.status !== "resolved") {
      failures.push(`d10=${roll}: ${r.resolution.reason ?? r.resolution.status}`);
    } else if (r.resolution.skipped?.some((s) => s.code === "effect_lines")) {
      failures.push(`d10=${roll}: effect_lines 未消费`);
    }
  }
  return failures;
}

it("R-200：已确认 6 张 Leper 高等级卡 d10 审计全绿", () => {
  const cards = LEPER_AUDIT_GREEN.map((id) => data.hero_skill.cards.find((c) => c.id === id)!);
  for (const card of cards) {
    const failures = auditCard(card as HeroSkillCardView);
    expect(failures, card.id).toEqual([]);
  }
});

it("Q-163～Q-166：待确认 8 张禁止为绿猜接线（当前应非全绿）", () => {
  const pending = LEPER_AUDIT_PENDING_Q.map(
    (id) => data.hero_skill.cards.find((c) => c.id === id)!,
  );
  const notGreen = pending.filter((card) => auditCard(card as HeroSkillCardView).length > 0);
  expect(notGreen.map((c) => c.id).sort()).toEqual([...LEPER_AUDIT_PENDING_Q].sort());
});
