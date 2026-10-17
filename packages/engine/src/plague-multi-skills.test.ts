import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { HeroSkillCardView } from "./hero-skill";
import { nextBattleRoll } from "./encounter";
import { resolveTurnStartStatus } from "./battle-status";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skills = [130, 133].map((p) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.pages[0] === p)!),
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p013:front")!,
);
const monsters = ["monster_medium:p024", "monster_medium:p021"].map((id) =>
  clean<NonNullable<BattleSetup["monsters"]>[number]>(
    data.monster_medium.cards.find((c) => c.id === id)!,
  ),
);
const entity = (g: GameState, id: string) => g.battle!.entities.find((e) => e.id === id)!;
function change(g: GameState, id: string, patch: Partial<BattleEntity>): GameState {
  return {
    ...g,
    battle: {
      ...g.battle!,
      entities: g.battle!.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    },
  };
}
/** 明示三实体机制夹具，属性与防御来自真实获批卡；不是正式英雄入口。 */
function setup(skill: HeroSkillCardView, roll = 5, area = "c") {
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters,
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
        stance: "support",
        skillIds: [skill.id],
      },
      ...monsters.map((m, i): BattleEntity => ({
        ...common,
        id: `m${i + 1}`,
        side: "monster",
        hero: null,
        monsterCardId: m.id,
        life: m.life!,
        dodge: i === 0 ? 0 : 7,
        areaId: area,
        stance: i === 0 ? "aggressive" : "defensive",
        stanceSlots: 1,
        skillIds: [],
      })),
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b", "d"], capacity: 8 },
      { id: "d", elevation: "normal", adjacent: ["c"], capacity: 8 },
    ],
  });
  return {
    game: {
      ...game,
      battle: {
        ...game.battle!,
        encounter: {
          round: 1,
          deck: ["hero", "monster"],
          actedIds: [],
          turn: { type: "hero", actorId: "h", actions: 2, usedSkillIds: [] },
        },
      },
    } as GameState,
    command: {
      type: "playHeroSkillTargets",
      actorId: "h",
      targetIds: ["m1", "m2"],
      skillId: skill.id,
    } as PlayHeroSkillTargetsCommand,
  };
}
function play(game: GameState, command: PlayHeroSkillTargetsCommand) {
  const r = applyCommand(game, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}

it.each(skills)("$id十骰面共享一次骰，分别判Dodge，伤害/状态/行动及JSON回放一致", (skill) => {
  const grenade = skill.id.endsWith("130");
  for (let roll = 1; roll <= 10; roll++) {
    const { game, command } = setup(skill, roll),
      before = structuredClone(game);
    const r = play(game, command);
    const event = r.events.find((e) => e.type === "heroSkillTargetsResolved");
    expect(event).toMatchObject({
      roll,
      resolutions: [
        {
          targetId: "m1",
          outcome: roll <= 9 ? "hit" : "miss",
          damageDealt: grenade && roll <= 9 ? 1 : null,
        },
        {
          targetId: "m2",
          outcome: roll <= 2 ? "hit" : "miss",
          damageDealt: grenade && roll <= 2 ? 1 : null,
        },
      ],
    });
    for (const [index, threshold] of [
      [1, 9],
      [2, 2],
    ]) {
      const target = entity(r.state, `m${index}`);
      expect(target.wounds).toBe(grenade && roll <= threshold! ? 1 : 0);
      expect(target.statusStacks).toEqual(
        roll > threshold!
          ? []
          : grenade
            ? [{ kind: "blight", amount: 3, remaining: index === 1 ? 1 : 2 }]
            : [{ kind: "stun", remaining: 1 }],
      );
    }
    expect(r.state.battle).toMatchObject({
      rngCursor: 1,
      encounter: { turn: { actions: 1, usedSkillIds: roll === 10 ? [] : [skill.id] } },
    });
    expect(game).toEqual(before);
    expect(applyCommand(game, command)).toEqual(r);
    expect(applyCommand(JSON.parse(JSON.stringify(game)), command)).toEqual(r);
  }
});

it.each(skills)("$id逐名回合开始消费，Blight抗性仅减时长，Stun不造成伤口", (skill) => {
  const { game, command } = setup(skill, 1),
    r = play(game, command);
  const grenade = skill.id.endsWith("130");
  for (const i of [1, 2]) {
    const tick = resolveTurnStartStatus(entity(r.state, `m${i}`), game.seed, 1);
    expect(tick).toMatchObject({
      status: "resolved",
      stunned: !grenade,
      rngCursor: 1,
      entity: {
        wounds: grenade ? 4 : 0,
        statusStacks: grenade && i === 2 ? [{ kind: "blight", amount: 3, remaining: 1 }] : [],
      },
    });
    if (tick.status !== "resolved") throw new Error(tick.reason);
    const second = resolveTurnStartStatus(tick.entity, game.seed, 1);
    expect(second).toMatchObject({
      status: "resolved",
      stunned: false,
      entity: { wounds: grenade ? (i === 1 ? 4 : 7) : 0, statusStacks: [] },
    });
  }
});

it("Plague Grenade I以真实Buff堆提高Crit后共用暴击，减压一次；基础Crit0不伪造暴击", () => {
  const { game, command } = setup(skills[0]!, 1);
  const r = play(
    change(game, "h", { buffStacks: 1, statusStacks: [{ kind: "buff", remaining: 2 }] }),
    command,
  );
  expect(entity(r.state, "h").stress).toBe(2);
  for (const id of ["m1", "m2"]) expect(entity(r.state, id).wounds).toBe(2);
  expect(r.state.battle!.rngCursor).toBe(1);
});

it.each(skills)("$id一目标可用，成功锁技能；全落空可重用并正常结束回合", (skill) => {
  const { game, command } = setup(skill, 1);
  const r = play(game, { ...command, targetIds: ["m1"] });
  expect(entity(r.state, "m2")).toEqual(entity(game, "m2"));
  expect(applyCommand(r.state, command).state).toBe(r.state);
  const missed = setup(skill, 10),
    first = play(missed.game, missed.command);
  const second = play(first.state, missed.command);
  expect(second.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
  expect(second.state.battle!.rngCursor).toBe(2);
});

it.each(skills)("$id姿态/射程/目标/未知防御/不完整注解原子拒绝，不消费RNG或行动", (skill) => {
  const { game, command } = setup(skill);
  const badStates = [
    change(game, "h", { stance: "defensive" }),
    change(game, "m1", { areaId: "b" }),
    change(change(game, "m1", { areaId: "d" }), "m2", { areaId: "d" }),
    change(game, "m2", { dead: true }),
    {
      ...game,
      battle: {
        ...game.battle!,
        monsters: monsters.map((m) => ({ ...m, resistances: undefined })),
      },
    },
    ...[
      undefined,
      [],
      [...skill.verified_status_effects!, ...skill.verified_status_effects!],
      [{ ...skill.verified_status_effects![0]!, duration: 9 }],
    ].map((verified_status_effects) => ({
      ...game,
      battle: { ...game.battle!, skills: [{ ...skill, verified_status_effects }] },
    })),
  ] as GameState[];
  for (const bad of badStates) expect(applyCommand(bad, command).state).toBe(bad);
  for (const targetIds of [["m1", "m1"], ["m1", "m2", "h"], ["h"], ["missing"]])
    expect(applyCommand(game, { ...command, targetIds }).state).toBe(game);
});

it("Blinding Gas I对真实Maggot眩晕免疫不落堆，另一命中目标仍获得完整Stun", () => {
  const { game, command } = setup(skills[1]!, 1);
  const maggot = clean<NonNullable<BattleSetup["monsters"]>[number]>(
    data.monster_medium.cards.find((c) => c.id === "monster_medium:p031")!,
  );
  const changed = change(game, "m1", { monsterCardId: maggot.id, life: maggot.life! });
  const ready = { ...changed, battle: { ...changed.battle!, monsters: [...monsters, maggot] } };
  const r = play(ready, command);
  expect(entity(r.state, "m1").statusStacks).toEqual([]);
  expect(entity(r.state, "m2").statusStacks).toEqual([{ kind: "stun", remaining: 1 }]);
  expect(r.state.battle!.rngCursor).toBe(1);
});

it("Plague Grenade I新增独立Blight堆，与原堆在回合开始同时受伤并死亡", () => {
  const { game, command } = setup(skills[0]!, 1);
  const ready = change(game, "m2", {
    statusStacks: [{ kind: "blight", amount: 5, remaining: 1 }],
  });
  const r = play(ready, command);
  expect(entity(r.state, "m2").statusStacks).toEqual([
    { kind: "blight", amount: 5, remaining: 1 },
    { kind: "blight", amount: 3, remaining: 2 },
  ]);
  const tick = resolveTurnStartStatus(entity(r.state, "m2"), game.seed, 1);
  expect(tick).toMatchObject({
    status: "resolved",
    rngCursor: 1,
    entity: { wounds: 9, dead: true },
  });
  if (tick.status !== "resolved") throw new Error(tick.reason);
  expect(tick.events.find((e) => e.type === "statusTurnStarted")).toMatchObject({
    woundAmounts: [5, 3],
  });
});

it("Blinding Gas I支持距离1与2；手雷严格距离2，两个技能都支持R/S", () => {
  for (const skill of skills)
    for (const stance of ["support", "ranged"] as const)
      for (const area of ["a", "b", "c", "d"]) {
        const { game, command } = setup(skill, 1, area),
          ready = change(game, "h", { stance });
        const allowed = area === "c" || (skill.id.endsWith("133") && area === "b");
        const r = applyCommand(ready, command);
        expect(r.events.some((e) => e.type === "commandRefused")).toBe(!allowed);
        if (!allowed) expect(r.state).toBe(ready);
      }
});
