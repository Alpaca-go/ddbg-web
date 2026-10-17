import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { resolveHeroSkillEffects } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { resolveTurnStartStatus } from "./battle-status";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skills = [127, 136].map((page) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.pages[0] === page)!),
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p013:front")!,
);
const entity = (game: GameState) => game.battle!.entities.find((e) => e.id === "m")!;

/** 两实体机制夹具：使用真实英雄与怪物卡，不冒称正式候选或战役入口。 */
function setup(skill: HeroSkillCardView, roll = 5, monsterId = "monster_medium:p021") {
  const monster = clean<NonNullable<BattleSetup["monsters"]>[number]>(
    data.monster_medium.cards.find((c) => c.id === monsterId)!,
  );
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters: [monster],
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
        stance: "defensive",
        skillIds: [skill.id],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: monster.id,
        life: monster.life!,
        dodge: 2,
        areaId: skill.id.endsWith("127") ? "b" : "a",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
  return {
    game,
    command: { type: "playHeroSkill", actorId: "h", targetId: "m", skillId: skill.id } as Command,
  };
}
function play(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}

it.each(skills)("$id 十骰面：伤害与完整目标状态按命中施加，不把DOT当即时伤害", (skill) => {
  const blast = skill.id.endsWith("127");
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(
      skill,
      {
        actor: { id: "h", stance: "defensive", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 2, life: 9 },
        areaDistance: blast ? 1 : 0,
        light: 5,
      },
      roll,
    ).resolution;
    expect(r).toMatchObject({
      status: "resolved",
      skipped: [],
      damageDealt: roll > 7 ? null : roll === 1 ? (blast ? 4 : 8) : blast ? 2 : 5,
    });
    expect(r.actorStatusEffects).toEqual([]);
    expect(r.targetStatusEffects).toEqual(
      roll > 7
        ? []
        : blast
          ? [
              { kind: "blight", amount: 4, duration: 2 },
              { kind: "debuff", duration: 1 },
            ]
          : [{ kind: "bleed", amount: 2, duration: 2 }],
    );
  }
});

it.each(skills)(
  "$id 公开命令暴击/命中/落空只用一次RNG；真实Debuff抗性、JSON及回放一致",
  (skill) => {
    const blast = skill.id.endsWith("127");
    for (const roll of [1, 5, 10]) {
      const { game, command } = setup(skill, roll),
        before = structuredClone(game);
      const r = play(game, command),
        target = entity(r.state);
      expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? (blast ? 4 : 8) : blast ? 2 : 5);
      expect(target.statusStacks).toEqual(
        roll === 10
          ? []
          : [{ kind: blast ? "blight" : "bleed", remaining: 2, amount: blast ? 4 : 2 }],
      );
      expect(r.state.battle!.rngCursor).toBe(1);
      expect(applyCommand(game, command)).toEqual(r);
      expect(applyCommand(JSON.parse(JSON.stringify(game)), command)).toEqual(r);
      expect(game).toEqual(before);
    }
  },
);

it.each([
  [
    0,
    "monster_medium:p024",
    [
      { kind: "blight", remaining: 1, amount: 4 },
      { kind: "debuff", remaining: 1 },
    ],
    6,
    false,
  ],
  [1, "monster_medium:p027", [{ kind: "bleed", remaining: 1, amount: 2 }], 7, false],
  [1, "monster_medium:p001", [], 5, false],
] as const)(
  "技能%s对%s：抗性只减时长，免疫不落堆，不改变DOT面值",
  (index, monsterId, stacks, wounds, dead) => {
    const { game, command } = setup(skills[index]!, 5, monsterId);
    const r = play(game, command),
      target = entity(r.state);
    expect(target.statusStacks).toEqual(stacks);
    const tick = resolveTurnStartStatus(target, r.state.seed, r.state.battle!.rngCursor);
    expect(tick).toMatchObject({
      status: "resolved",
      entity: { wounds, dead, statusStacks: [] },
      rngCursor: 1,
    });
  },
);

it.each(skills)("$id 两次真实回合开始消费DOT并死亡，不把伤口加到技能本次攻击", (skill) => {
  const { game, command } = setup(skill),
    played = play(game, command);
  let target = entity(played.state);
  const amount = skill.id.endsWith("127") ? 4 : 2,
    base = target.wounds;
  for (let tick = 1; tick <= 2; tick++) {
    const r = resolveTurnStartStatus(target, game.seed, 1);
    expect(r.status).toBe("resolved");
    if (r.status !== "resolved") throw new Error(r.reason);
    expect(r.entity.wounds).toBe(base + amount * tick);
    expect(r.entity.dead).toBe(tick === 2);
    expect(r.rngCursor).toBe(1);
    target = r.entity;
  }
  expect(target.statusStacks).toEqual([]);
});

it.each(skills)("$id 缺值、重复或不完整注解、坏射程/姿态和未知防御均原子拒绝", (skill) => {
  const { game, command } = setup(skill);
  const annotations = skill.verified_status_effects!;
  for (const changed of [
    { ...skill, verified_status_effects: [{ ...annotations[0]!, duration: undefined }] },
    { ...skill, verified_status_effects: [...annotations, annotations[0]!] },
    { ...skill, verified_status_effects: [{ ...annotations[0]!, amount: undefined }] },
    { ...skill, verified_status_effects: [{ ...annotations[0]!, amount: 9 }] },
    { ...skill, verified_status_effects: annotations.slice(1) },
  ]) {
    const bad = { ...game, battle: { ...game.battle!, skills: [changed] } } as GameState;
    expect(applyCommand(bad, command).state).toBe(bad);
  }
  for (const patch of [
    {
      entities: game.battle!.entities.map((e) =>
        e.id === "h"
          ? {
              ...e,
              stance: skill.id.endsWith("127") ? ("aggressive" as const) : ("support" as const),
            }
          : e,
      ),
    },
    {
      entities: game.battle!.entities.map((e) =>
        e.id === "m" ? { ...e, areaId: skill.id.endsWith("127") ? "a" : "b" } : e,
      ),
    },
    { monsters: game.battle!.monsters!.map((m) => ({ ...m, resistances: undefined })) },
  ]) {
    const bad = { ...game, battle: { ...game.battle!, ...patch } } as GameState;
    expect(applyCommand(bad, command).state).toBe(bad);
  }
});
