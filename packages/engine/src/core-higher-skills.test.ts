import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
} from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { coreHigherSkillAvailable, CORE_HIGHER_SKILL_HOLDS } from "./core-higher-skill-catalog";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { applyCommand } from "./command";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
const data = loadNormalizedCorebox();
const cards = data.hero_skill.cards.filter(coreHigherSkillAvailable);
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));
it("Mark II self Buff3t survives a miss; Caltrops II applies Bleed3 for 2t and Debuff2t", () => {
  const combat = {
    actor: { id: "h", wounds: 0, stress: 0 },
    target: { id: "m", side: "monster" as const, wounds: 0, dodge: 20 },
  };
  const mark = clean<HeroSkillCardView>(cards.find((c) => c.id === "hero_skill:p047")!);
  const miss = resolveHeroSkillEffects(mark, combat, 10).resolution;
  expect(miss.outcome).toBe("miss");
  expect(miss.actorStatusEffects).toEqual([{ kind: "buff", duration: 3 }]);
  expect(miss.targetStatusEffects).toEqual([]);
  const caltrops = clean<HeroSkillCardView>(cards.find((c) => c.id === "hero_skill:p062")!);
  const hit = resolveHeroSkillEffects(
    caltrops,
    { ...combat, target: { ...combat.target, dodge: 0 } },
    1,
  ).resolution;
  expect(hit.targetStatusEffects).toEqual([
    { kind: "bleed", amount: 3, duration: 2 },
    { kind: "debuff", duration: 2 },
  ]);
});
it("154 core higher cards are partitioned into 141 available and 13 explicit holds", () => {
  expect(cards).toHaveLength(141);
  expect(Object.keys(CORE_HIGHER_SKILL_HOLDS)).toHaveLength(13);
  const load = battleDataPlugin().load as (id: string) => string;
  const catalog = JSON.parse(
    load("\0virtual:quest-battle-data").slice("export const battleData = ".length, -1),
  );
  for (const c of cards)
    expect(
      catalog.skills.some((s: { id: string }) => s.id === c.id),
      c.id,
    ).toBe(true);
  for (const p of Object.keys(CORE_HIGHER_SKILL_HOLDS))
    expect(
      catalog.skills.some((s: { id: string }) => s.id === `hero_skill:p${p.padStart(3, "0")}`),
    ).toBe(false);
});
it.each(cards)("$id $name: all d10 faces resolve every effect line deterministically", (raw) => {
  const card = clean<HeroSkillCardView>(raw),
    self = heroSkillUsesSelfTarget(card);
  const friendly =
    self ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card),
    targets = readPrintedTargets(card);
  const combat = {
    actor: { id: "h", wounds: 5, stress: 3 },
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
it.each(
  cards.filter((c) => !["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(c.hero ?? "")),
)("$id: public battle command", (raw) => {
  const card = clean<HeroSkillCardView>(raw),
    range = readPrintedRange(card),
    targets = readPrintedTargets(card);
  const distance =
    range.kind === "exact" ? range.distance : range.kind === "interval" ? range.min : 0;
  const area = ["a", "b", "c"][distance]!;
  const lit = raw.top_row_icons.find((i) => /^stance_.*_lit$/.test(i.key ?? ""));
  const stance = (lit?.key?.replace(/^stance_|_lit$/g, "") ?? "ranged") as NonNullable<
    BattleEntity["stance"]
  >;
  const stats = data.hero_stat.cards.filter(
    (s) =>
      s.attributesVerified &&
      s.level === raw.level &&
      [raw.hero, "CRUSADER", "VESTAL", "HELLION"].includes(s.name),
  );
  const actor = stats.find((s) => s.name === raw.hero)!;
  const order = [actor, ...stats.filter((s) => s.id !== actor.id)].slice(0, 4);
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const entities: BattleEntity[] = order.map((s, i) => ({
    ...common,
    id: `h${i}`,
    side: "hero",
    hero: s.name,
    heroStatId: s.id,
    heroLevel: s.level,
    life: s.life,
    dodge: s.dodge,
    stress: 3,
    areaId: i === 0 ? "a" : area,
    stance: i === 0 ? stance : (["support", "ranged", "defensive"] as const)[i - 1]!,
    skillIds: i === 0 ? [raw.id] : [],
    ...(s.name === "ABOMINATION" ? { form: "human" as const } : {}),
  }));
  const monster = data.monster_medium.cards.find((c) => c.id === "monster_medium:p001")!;
  if (!("life" in monster)) throw new Error("Expected verified monster attributes");
  for (let i = 0; i < 3; i++)
    entities.push({
      ...common,
      id: `m${i}`,
      side: "monster",
      hero: null,
      monsterCardId: monster.id,
      life: monster.life!,
      dodge: 0,
      areaId: area,
      stance: (["aggressive", "defensive", "ranged"] as const)[i]!,
      stanceSlots: 1,
      skillIds: [],
    });
  const state = createBattleState(42, {
    heroStats: clean<NonNullable<BattleSetup["heroStats"]>>(order),
    monsters: clean<NonNullable<BattleSetup["monsters"]>>([monster]),
    skills: [card],
    entities,
    light: 4,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 12 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 12 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 12 },
    ],
  });
  const self = heroSkillUsesSelfTarget(card),
    friendly =
      self ||
      (raw.stats_line ?? raw.effect_lines[0] ?? []).some(
        (s) =>
          s.type === "icon" && ["target_hero", "target_hero_or_monster"].includes(s.icon.key ?? ""),
      );
  const count = targets.kind === "exact" ? targets.max : 1;
  const ids = self
    ? ["h0"]
    : Array.from({ length: count }, (_, i) => (friendly ? `h${(i + 1) % 4}` : `m${i}`));
  const command =
    count > 1
      ? { type: "playHeroSkillTargets" as const, actorId: "h0", skillId: raw.id, targetIds: ids }
      : { type: "playHeroSkill" as const, actorId: "h0", skillId: raw.id, targetId: ids[0]! };
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state).not.toBe(state);
  expect(applyCommand(state, command)).toEqual(result);
});
