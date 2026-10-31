import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { savedCommandSchema } from "../../data/src/quest-save";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command } from "./command";
import { resolveHeroSkillEffects } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));
const card = (page: number) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.id === `hero_skill:p${page}`)!);
function fixture(level: 2 | 3 = 2) {
  const names = ["ABOMINATION", "CRUSADER", "HELLION", "VESTAL"];
  const stats = data.hero_stat.cards.filter((c) => c.level === level && names.includes(c.name));
  const entities: BattleEntity[] = names.map((name, i) => {
    const stat = stats.find((c) => c.name === name)!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      heroLevel: level,
      life: stat.life,
      dodge: stat.dodge,
      wounds: 8,
      stress: 3,
      areaId: i === 0 ? "a" : "b",
      stance: (["support", "ranged", "defensive", "aggressive"] as const)[i]!,
      skillIds: i === 0 ? [218, 221, 224, 227, 230].map((p) => `hero_skill:p${p + level - 2}`) : [],
      form: "human",
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      statusStacks: [],
    };
  });
  return createBattleState(17, {
    entities,
    heroStats: clean<NonNullable<BattleSetup["heroStats"]>>(stats),
    skills: [218, 221, 224, 227, 230].map((p) => card(p + level - 2)),
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: [] },
      { id: "b", elevation: "normal", adjacent: [] },
    ],
  });
}
const transform = (level: 2 | 3 = 2): Command => ({
  type: "playHeroSkill",
  actorId: "h0",
  targetId: "h0",
  skillId: `hero_skill:p${221 + level - 2}`,
});
it.each([2, 3] as const)(
  "Transform %i applies all allies across disconnected areas, no dice; automatic reverse uses the same card",
  (level) => {
    const before = fixture(level),
      snapshot = structuredClone(before),
      cmd = transform(level);
    expect(savedCommandSchema.parse(cmd)).toEqual(cmd);
    const result = applyCommand(before, cmd);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(result.state.battle!.entities[0]).toMatchObject({
      form: "beast",
      wounds: level === 2 ? 2 : 0,
      stress: 3,
      statusStacks: [{ kind: "buff", remaining: 3 }],
    });
    expect(result.state.battle!.entities.slice(1).map((e) => e.stress)).toEqual([5, 5, 5]);
    const restored = clean<typeof before>(result.state);
    const reverse = applyCommand(restored, cmd);
    expect(reverse).toEqual(applyCommand(result.state, cmd));
    expect(reverse.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(reverse.state.battle!.entities[0]).toMatchObject({
      form: "human",
      wounds: level === 2 ? 2 : 0,
      stress: 2,
    });
    expect(reverse.state.battle!.entities[0]!.statusStacks).toContainEqual({
      kind: "debuff",
      remaining: level === 2 ? 2 : 1,
    });
    expect(reverse.state.battle!.entities.slice(1).map((e) => e.stress)).toEqual([4, 4, 4]);
    expect(reverse.state.battle!.rngCursor).toBe(0);
    expect(before).toEqual(snapshot);
  },
);
it.each([218, 219])(
  "Absolution p%i heals only its caster with printed critical/hit amounts",
  (page) => {
    const c = card(page),
      amounts = page === 218 ? [6, 3] : [8, 4];
    for (const [roll, amount] of [
      [1, amounts[0]!],
      [5, amounts[1]!],
    ] as const) {
      const r = resolveHeroSkillEffects(
        c,
        {
          actor: { id: "h", wounds: 10, stress: 3, form: "human" },
          target: { id: "h", side: "hero", wounds: 10, stress: 3, dodge: 0 },
          areaDistance: 0,
          targetsInArea: 1,
          light: 5,
        },
        roll,
      ).resolution;
      expect(r.status, r.reason ?? "").toBe("resolved");
      expect(r.actorWounds).toBe(10 - amount);
      expect(r.actorStress).toBe(roll === 1 ? 1 : 2);
    }
  },
);
it.each([224, 225, 227, 228, 230, 231])(
  "p%i self stress survives a miss, and human form refuses without effects",
  (page) => {
    const c = card(page),
      combat = {
        actor: { id: "h", wounds: 0, stress: 3, form: "beast" as const },
        target: { id: "m", side: "monster" as const, wounds: 0, dodge: 20 },
        light: 5,
        areaDistance: page >= 230 ? 1 : 0,
        targetsInArea: page < 226 ? 2 : 1,
      };
    const r = resolveHeroSkillEffects(c, combat, 10).resolution;
    expect(r.status, r.reason ?? "").toBe("resolved");
    expect(r.outcome).toBe("miss");
    expect(r.actorStress).toBe(4);
    expect(r.targetStatusEffects ?? []).toEqual([]);
    expect(r.actorStatusEffects ?? []).toEqual(page < 226 ? [{ kind: "buff", duration: 2 }] : []);
    if (page >= 230) {
      expect(r.actorShuffle).toEqual({ direction: "pull", distance: 1 });
      expect(r.targetShuffle).toBeNull();
    }
    expect(
      resolveHeroSkillEffects(c, { ...combat, actor: { ...combat.actor, form: "human" } }, 10)
        .resolution.status,
    ).toBe("refused");
  },
);
it("Transform omits dead allies, rejects another target and wrong face, and refuses transcription drift without RNG", () => {
  let game = fixture();
  game = {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((e) => (e.id === "h1" ? { ...e, dead: true } : e)),
    },
  };
  const r = applyCommand(game, transform());
  expect(r.state.battle!.entities[1]!.stress).toBe(3);
  for (const cmd of [
    { ...transform(), targetId: "h2" },
    { ...transform(), face: "back" as const },
  ]) {
    const rejected = applyCommand(game, cmd);
    expect(rejected.state).toBe(game);
    expect(rejected.events[0]!.type).toBe("commandRefused");
  }
  const bad = {
    ...game,
    battle: {
      ...game.battle!,
      skills: game.battle!.skills.map((s) =>
        s.id === "hero_skill:p221" ? { ...s, effect_lines: [] } : s,
      ),
    },
  };
  expect(applyCommand(bad, transform()).state).toBe(bad);
});
// Explicit combat mechanism fixture; neutral monsters are not game card data.
function encounterFixture() {
  const game = fixture();
  const monsters: BattleEntity[] = [0, 1].map((i) => ({
    id: `m${i}`,
    side: "monster",
    hero: null,
    monsterCardId: "neutral",
    life: 100,
    dodge: 20,
    wounds: 0,
    areaId: "a",
    stance: i === 0 ? "aggressive" : "defensive",
    stanceSlots: 1,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    statusStacks: [],
  }));
  return {
    ...game,
    battle: {
      ...game.battle!,
      entities: [...game.battle!.entities, ...monsters],
      monsters: [
        {
          id: "neutral",
          life: 100,
          verification: { unverified: false },
          type_position_tags: ["Beast"],
          resistances: [],
          immunities: [],
          skills: [],
        },
      ],
      resolveCards: clean<NonNullable<BattleSetup["resolveCards"]>>(data.virtue_affliction.cards),
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "hero" as const, actorId: "h0", actions: 3, usedSkillIds: [] },
      },
    },
  };
}
it("Rake shared roll charges self Buff/stress once on two misses and spends one action", () => {
  let game = encounterFixture();
  game = {
    ...game,
    seed: 1,
    battle: {
      ...game.battle,
      entities: game.battle.entities.map((e) =>
        e.id === "h0" ? { ...e, form: "beast", stance: "aggressive" } : e,
      ),
    },
  };
  const cmd: Command = {
    type: "playHeroSkillTargets",
    actorId: "h0",
    skillId: "hero_skill:p224",
    targetIds: ["m0", "m1"],
  };
  const result = applyCommand(game, cmd);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.battle!.entities[0]!.stress).toBe(4);
  expect(result.state.battle!.entities[0]!.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
  expect(result.state.battle!.rngCursor).toBe(1);
  expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 2 });
  expect(applyCommand(clean<typeof game>(game), cmd)).toEqual(result);
});
it("Transform resolves remote allies reaching 10, keeps its self effects, and spends one action", () => {
  let game = encounterFixture();
  game = {
    ...game,
    battle: {
      ...game.battle,
      entities: game.battle.entities.map((e) => (e.id === "h1" ? { ...e, stress: 8 } : e)),
    },
  };
  const result = applyCommand(game, transform());
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.events.some((e) => e.type === "resolveTested" && e.entityId === "h1")).toBe(true);
  expect(result.state.battle!.entities[0]).toMatchObject({
    form: "beast",
    wounds: 2,
    statusStacks: [{ kind: "buff", remaining: 3 }],
  });
  expect(result.state.battle!.entities[1]).toMatchObject({ stress: 0, resolveTested: true });
  expect(result.state.battle!.rngCursor).toBeGreaterThan(0);
  expect(result.state.battle!.encounter!.turn).toMatchObject({
    type: "hero",
    actions: 2,
    usedSkillIds: ["hero_skill:p221"],
  });
  expect(applyCommand(clean<typeof game>(game), transform())).toEqual(result);
});
it.each([230, 231])("Slam p%i preserves both scopes on a hit", (page) => {
  const r = resolveHeroSkillEffects(
    card(page),
    {
      actor: { id: "h", form: "beast", wounds: 0, stress: 3 },
      target: { id: "m", side: "monster", wounds: 0, dodge: 0 },
      areaDistance: 1,
      targetsInArea: 1,
      light: 5,
    },
    1,
  ).resolution;
  expect(r.status, r.reason ?? "").toBe("resolved");
  expect(r.actorStress).toBe(4);
  expect(r.actorShuffle).toEqual({ direction: "pull", distance: 1 });
  expect(r.targetShuffle).toEqual({ direction: "push", distance: 2 });
  expect(r.targetStatusEffects).toEqual([{ kind: "debuff", duration: 2 }]);
  expect(r.damageDealt).toBe(page === 230 ? 9 : 12);
});
it.each([212, 213, 215, 216])("Human-only p%i is unavailable in Beast form", (page) => {
  const r = resolveHeroSkillEffects(
    card(page),
    {
      actor: { id: "h", form: "beast", wounds: 0, stress: 3 },
      target: { id: "m", side: "monster", wounds: 0, dodge: 0 },
    },
    1,
  ).resolution;
  expect(r.status).toBe("refused");
});
