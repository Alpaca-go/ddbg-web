import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleSetup, Command, GameState, HeroSkillCardView } from "./index";
import type { StatusStack } from "./status";
import { nextBattleRoll } from "./encounter";
import { resolveTurnStartStatus } from "./battle-status";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skill = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p058")!,
);
const uppercut = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p052")!,
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p005:front")!,
);
const monster = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p021")!,
);
const stacks = (count: number): StatusStack[] =>
  Array.from({ length: count }, () => ({ kind: "stun", remaining: 1 }));
const target = (game: GameState) => game.battle!.entities.find((e) => e.id === "m")!;
function setup(count = 1, roll = 5, sameArea = false) {
  const seed = Array.from({ length: 10000 }, (_, i) => i).find(
    (s) => nextBattleRoll(s, 0) === roll && nextBattleRoll(s, 1) === 5,
  )!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [] };
  const initial = createBattleState(seed, {
    heroStats: [stat],
    monsters: [monster],
    skills: [skill, uppercut],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "BOUNTY HUNTER",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge,
        stress: 3,
        areaId: "a",
        stance: "defensive",
        skillIds: [skill.id, uppercut.id],
        statusStacks: [],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: monster.id,
        life: monster.life,
        dodge: 2,
        areaId: sameArea ? "a" : "b",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
        statusStacks: stacks(count),
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
  const game: GameState = {
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
  };
  const command: Command = {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "m",
    skillId: skill.id,
  };
  return { game, command };
}
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}

it("Finish Him I 十骰面与0/1/3堆：只加一次伤害，Protection/Riposte按加成后数值结算", () => {
  for (const count of [0, 1, 3])
    for (let roll = 1; roll <= 10; roll++)
      for (const protection of [false, true]) {
        const r = resolveHeroSkill(
          skill,
          {
            actor: { id: "h", stance: "defensive", wounds: 0, stress: 3 },
            target: {
              id: "m",
              side: "monster",
              wounds: 0,
              dodge: 2,
              statusStacks: stacks(count),
              protection,
              riposte: true,
            },
            areaDistance: 1,
            light: 5,
          },
          roll,
        );
        const hit = roll <= 7,
          base = (roll === 1 ? 10 : 6) + (count ? 2 : 0);
        expect(r).toMatchObject({
          status: "resolved",
          skipped: [],
          outcome: !hit ? "miss" : roll === 1 ? "crit" : "hit",
          damageDealt: hit ? (protection ? Math.ceil(base / 2) : base) : null,
          riposteDamage: hit ? Math.ceil(base / 2) : null,
          printedAmount: hit ? (roll === 1 ? 10 : 6) : null,
        });
      }
});

it("公开命令读取真实Stun堆，不额外消费代币；一行动一骰及JSON/种子回放", () => {
  for (const count of [0, 1, 3]) {
    const { game, command } = setup(count),
      before = structuredClone(game);
    const r = ok(game, command);
    expect(target(r.state)).toMatchObject({ wounds: count ? 8 : 6, statusStacks: stacks(count) });
    expect(r.state.battle!.encounter!.turn).toMatchObject({
      type: "hero",
      actorId: "h",
      actions: 1,
      usedSkillIds: [skill.id],
    });
    expect(r.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(game, command)).toEqual(r);
    expect(applyCommand(clean<GameState>(game), command)).toEqual(r);
    expect(game).toEqual(before);
  }
});

it("Uppercut→完整位移→Finish Him：现有Stun增加2伤害并完成死亡/胜利，只有两骰", () => {
  const { game, command } = setup(0, 5, true);
  const first = ok(game, { ...command, type: "playHeroSkill", skillId: uppercut.id });
  expect(target(first.state)).toMatchObject({ wounds: 3, statusStacks: stacks(1) });
  const moved = ok(first.state, { type: "resolveShuffles" });
  expect(target(moved.state)).toMatchObject({
    areaId: "b",
    stance: "ranged",
    statusStacks: stacks(1),
  });
  const done = ok(moved.state, command);
  expect(target(done.state)).toMatchObject({ dead: true, wounds: 11 });
  expect(done.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
  expect(done.state.battle!.rngCursor).toBe(2);
  expect(applyCommand(clean<GameState>(moved.state), command)).toEqual(done);
});

it("最后一枚Stun已在回合开始消费时不再加伤；多个堆仅剩一个也只加2", () => {
  for (const statusStacks of [stacks(1), [...stacks(1), { kind: "stun" as const, remaining: 2 }]]) {
    const { game, command } = setup();
    const started = resolveTurnStartStatus({ ...target(game), statusStacks }, game.seed, 0);
    expect(started.status).toBe("resolved");
    if (started.status !== "resolved") throw new Error(started.reason);
    expect(started.stunned).toBe(true);
    const after = {
      ...game,
      battle: {
        ...game.battle!,
        entities: game.battle!.entities.map((e) => (e.id === "m" ? started.entity : e)),
      },
    };
    expect(target(ok(after, command).state).wounds).toBe(statusStacks.length === 1 ? 6 : 8);
  }
});

it("目标Buff/Mark不冒充Stun；无注解保留旧效果边界，缺失或非法状态原子拒绝", () => {
  const { game, command } = setup();
  const combat = {
    target: {
      id: "m",
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      statusStacks: [{ kind: "buff" as const, remaining: 2 }],
    },
  };
  expect(resolveHeroSkill(skill, combat, 5)).toMatchObject({ status: "resolved", damageDealt: 6 });
  const { verified_damage_bonus: _bonus, ...legacy } = skill;
  void _bonus;
  expect(
    resolveHeroSkill(legacy, { target: { ...combat.target, statusStacks: stacks(1) } }, 5),
  ).toMatchObject({ damageDealt: 6, skipped: [{ code: "effect_lines" }] });
  for (const statusStacks of [
    undefined,
    null,
    [{ kind: "stun", remaining: 0 }],
    [{ kind: "stun", remaining: 1, amount: 2 }],
  ]) {
    const bad = clean<GameState>({
      ...game,
      battle: {
        ...game.battle!,
        entities: game.battle!.entities.map((e) => (e.id === "m" ? { ...e, statusStacks } : e)),
      },
    });
    expect(applyCommand(bad, command).state).toBe(bad);
  }
  const far = {
    ...game,
    battle: {
      ...game.battle!,
      areas: [
        { id: "a", elevation: "normal" as const, adjacent: ["c"] },
        { id: "c", elevation: "normal" as const, adjacent: ["a", "b"] },
        { id: "b", elevation: "normal" as const, adjacent: ["c"] },
      ],
    },
  };
  expect(applyCommand(far, command).state).toBe(far);
});
