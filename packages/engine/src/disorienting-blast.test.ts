import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleSetup, Command, GameState, HeroSkillCardView } from "./index";
import { needsHeroSkillShuffleChoice } from "./hero-skill";
import { nextBattleRoll } from "./encounter";
import { resolveTurnStartStatus } from "./battle-status";

const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));
const skill = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p145")!,
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p013:front")!,
);
/** 真实卡牌机制夹具；位置/压力/Dodge及回合入口明示，不冒充正式候选入口。 */
function setup(roll = 5, fork = false, monsterId = "monster_medium:p021") {
  const enemy = clean<NonNullable<BattleSetup["monsters"]>[number]>(
    data.monster_medium.cards.find((c) => c.id === monsterId)!,
  );
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const initial = createBattleState(seed, {
    heroStats: [stat],
    monsters: [enemy],
    skills: [skill],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "PLAGUE DOCTOR",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge,
        stress: 3,
        areaId: "a",
        stance: "ranged",
        skillIds: [skill.id],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: enemy.id,
        life: enemy.life!,
        dodge: 2,
        areaId: "b",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
        shuffleResist: enemy.resistances?.some((i) => i.key === "shuffle_resist") ?? false,
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: fork ? ["b", "d", "e"] : ["b", "d"], capacity: 8 },
      { id: "d", elevation: "normal", adjacent: ["c"], capacity: 8 },
      ...(fork ? [{ id: "e", elevation: "normal" as const, adjacent: ["c"], capacity: 8 }] : []),
    ],
  });
  const game = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h", actions: 2, usedSkillIds: [] },
      },
    },
  } as GameState;
  return {
    game,
    command: { type: "playHeroSkill", actorId: "h", targetId: "m", skillId: skill.id } as Extract<
      Command,
      { type: "playHeroSkill" }
    >,
  };
}
const target = (g: GameState) => g.battle!.entities.find((e) => e.id === "m")!;
const choice = (g: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: g.battle!.pending!.choice.id,
  optionId,
});
function ok(g: GameState, c: Command) {
  const r = applyCommand(g, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}

it("两方向十骰面：Acc9减Dodge2，无Crit/伤害；命中才有Shuffle2与Stun1t", () => {
  expect(needsHeroSkillShuffleChoice(skill)).toBe(true);
  for (const shuffleChoice of ["push", "pull"] as const)
    for (let roll = 1; roll <= 10; roll++) {
      const r = resolveHeroSkill(
        skill,
        {
          actor: { id: "h", stance: "ranged", wounds: 0, stress: 3, buffStacks: 4 },
          target: { id: "m", side: "monster", wounds: 0, dodge: 2, debuffStacks: 4 },
          areaDistance: 1,
          light: 5,
          shuffleChoice,
        },
        roll,
      );
      expect(r).toMatchObject({
        status: "resolved",
        outcome: roll <= 7 ? "hit" : "miss",
        effect: null,
        printedAmount: null,
        damageDealt: null,
        wounds: 0,
        actorStress: 3,
        skipped: [],
        targetShuffle: roll <= 7 ? { direction: shuffleChoice, distance: 2 } : null,
        targetStatusEffects: roll <= 7 ? [{ kind: "stun", duration: 1 }] : [],
      });
    }
});

it.each(["push", "pull"] as const)(
  "%s掷前选择冻结动作，位移区域/姿态独立截断，完成只扣一次行动/骰且JSON回放一致",
  (direction) => {
    const { game, command } = setup(),
      before = structuredClone(game);
    const waiting = ok(game, command);
    expect(waiting.pendingChoice!.options.map((o) => o.id)).toEqual(["push", "pull"]);
    expect(waiting.state.battle).toMatchObject({ rngCursor: 0 });
    expect(waiting.state.battle!.entities).toEqual(game.battle!.entities);
    expect(waiting.state.battle!.encounter).toEqual(game.battle!.encounter);
    expect(applyCommand(waiting.state, command).state).toBe(waiting.state);
    expect(applyCommand(waiting.state, choice(waiting.state, "invalid")).state).toBe(waiting.state);
    const selected = choice(waiting.state, direction),
      played = ok(waiting.state, selected);
    expect(target(played.state)).toMatchObject({
      wounds: 0,
      statusStacks: [{ kind: "stun", remaining: 1 }],
    });
    expect(played.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(clean<GameState>(waiting.state), selected)).toEqual(played);
    const done = ok(played.state, { type: "resolveShuffles" });
    expect(target(done.state)).toMatchObject({
      areaId: direction === "push" ? "d" : "a",
      stance: direction === "push" ? "ranged" : "aggressive",
      wounds: 0,
      statusStacks: [{ kind: "stun", remaining: 1 }],
    });
    expect(done.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [skill.id],
    });
    expect(done.state.battle!.rngCursor).toBe(1);
    const commands: Command[] = [command, selected, { type: "resolveShuffles" }];
    expect(commands.reduce((s, c) => ok(s, c).state, clean<GameState>(game))).toEqual(done.state);
    expect(applyCommand(done.state, selected).state).toBe(done.state);
    const tick = resolveTurnStartStatus(target(done.state), game.seed, 1);
    expect(tick).toMatchObject({
      status: "resolved",
      stunned: true,
      rngCursor: 1,
      entity: { wounds: 0, statusStacks: [] },
    });
    expect(game).toEqual(before);
  },
);

it("第二步落点分岔保留路径，过期方向choice不能复用，完成后不重复Stun/耗骰", () => {
  const { game, command } = setup(5, true),
    waiting = ok(game, command);
  const oldChoice = choice(waiting.state, "push"),
    played = ok(waiting.state, oldChoice);
  const pending = ok(played.state, { type: "resolveShuffles" });
  expect(pending.pendingChoice!.options.map((o) => o.id)).toEqual(["d", "e"]);
  expect(target(pending.state).areaId).toBe("b");
  expect(pending.state.battle!.pending).toMatchObject({ path: ["c"] });
  expect(applyCommand(pending.state, oldChoice).state).toBe(pending.state);
  expect(applyCommand(pending.state, command).state).toBe(pending.state);
  const selected = choice(pending.state, "e"),
    done = ok(pending.state, selected);
  expect(target(done.state)).toMatchObject({
    areaId: "e",
    stance: "ranged",
    statusStacks: [{ kind: "stun", remaining: 1 }],
  });
  expect(done.state.battle!.rngCursor).toBe(1);
  expect(done.state.battle!.encounter!.turn).toMatchObject({
    actions: 1,
    usedSkillIds: [skill.id],
  });
  expect(applyCommand(clean<GameState>(pending.state), selected)).toEqual(done);
});

it.each(["push", "pull"] as const)(
  "%s落空没有状态/位移，显式方向与待选一致，可再次使用",
  (shuffleChoice) => {
    const { game, command } = setup(10),
      waiting = ok(game, command);
    const done = ok(waiting.state, choice(waiting.state, shuffleChoice));
    expect(target(done.state)).toMatchObject({
      areaId: "b",
      stance: "aggressive",
      wounds: 0,
      statusStacks: [],
    });
    expect(done.state.battle).toMatchObject({
      rngCursor: 1,
      shuffleIntents: [],
      encounter: { turn: { actions: 1, usedSkillIds: [] } },
    });
    const explicit = ok(game, { ...command, type: "playHeroSkill", shuffleChoice });
    expect(explicit.state.battle!.entities).toEqual(done.state.battle!.entities);
    expect(explicit.state.battle!.encounter).toEqual(done.state.battle!.encounter);
  },
);

it.each([
  ["monster_medium:p031", "d", "ranged", []],
  ["monster_medium:p016", "d", "ranged", []],
  ["monster_medium:p010", "c", "defensive", [{ kind: "stun", remaining: 1 }]],
] as const)(
  "%s真实免疫/抗性：独立处理Stun与Shuffle距离，不造伤害",
  (id, areaId, stance, statusStacks) => {
    const { game, command } = setup(5, false, id);
    const played = ok(game, { ...command, type: "playHeroSkill", shuffleChoice: "push" });
    const done = ok(played.state, { type: "resolveShuffles" });
    expect(target(done.state)).toMatchObject({ wounds: 0, areaId, stance, statusStacks });
  },
);

it("满区阻断区域位移仍移动两格姿态，Stun不丢且行动结算一次", () => {
  const { game, command } = setup();
  const ready = {
    ...game,
    battle: {
      ...game.battle!,
      areas: game.battle!.areas.map((a) => (a.id === "c" ? { ...a, capacity: 0 } : a)),
    },
  };
  const played = ok(ready, { ...command, type: "playHeroSkill", shuffleChoice: "push" });
  const done = ok(played.state, { type: "resolveShuffles" });
  expect(target(done.state)).toMatchObject({
    areaId: "b",
    stance: "ranged",
    statusStacks: [{ kind: "stun", remaining: 1 }],
  });
  expect(done.state.battle!.rngCursor).toBe(1);
});

it("D/R/S可用，A与距离0/2拒绝；缺注解、坏作用域/整行、未知防御在方向待选前原子拒绝", () => {
  const { game, command } = setup();
  for (const stance of ["defensive", "ranged", "support"] as const) {
    const ready = {
      ...game,
      battle: {
        ...game.battle!,
        entities: game.battle!.entities.map((e) => (e.id === "h" ? { ...e, stance } : e)),
      },
    };
    expect(ok(ready, command).pendingChoice).toBeDefined();
  }
  for (const field of [
    "missing",
    "scope",
    "duration",
    "parent",
    "direction",
    "extra",
    "defence",
    "stance",
    "range0",
    "range2",
  ] as const) {
    const bad = clean<GameState>(game),
      b = bad.battle!;
    const changed = clean<Record<string, unknown>>(skill);
    if (field === "missing") delete changed.verified_status_effects;
    if (field === "scope" || field === "duration" || field === "parent")
      changed.verified_status_effects = [
        {
          ...skill.verified_status_effects![0]!,
          ...(field === "scope"
            ? { scopeLineIndex: undefined }
            : field === "duration"
              ? { duration: 9 }
              : { scopeLineIndex: 1 }),
        },
      ];
    if (field === "direction" || field === "extra")
      changed.effect_lines = skill.effect_lines.map((l, i) =>
        field === "extra" && i === 1
          ? [...l, { type: "text", text: "extra" }]
          : l.map((s) =>
              s.type === "text" ? { ...s, text: s.text.replace("Pull 2", "Pull 1") } : s,
            ),
      );
    const ready = {
      ...bad,
      battle: {
        ...b,
        skills: [changed as unknown as HeroSkillCardView],
        ...(field === "defence"
          ? {
              monsters: b.monsters!.map((m) => {
                const c = { ...m };
                delete c.resistances;
                return c;
              }),
            }
          : {}),
        entities: b.entities.map((e) =>
          field === "stance" && e.id === "h"
            ? { ...e, stance: "aggressive" as const }
            : (field === "range0" || field === "range2") && e.id === "m"
              ? { ...e, areaId: field === "range0" ? "a" : "c" }
              : e,
        ),
      },
    };
    expect(applyCommand(ready, command).state, field).toBe(ready);
  }
});
