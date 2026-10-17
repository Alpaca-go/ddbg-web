import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, BattleSetup, Command, HeroSkillCardView } from "./index";

const file = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
) as { cards: HeroSkillCardView[] };
function card(id: string): HeroSkillCardView {
  const found = file.cards.find((entry) => entry.id === `hero_skill:${id}`);
  if (!found) throw new Error(`缺少技能 ${id}`);
  return found;
}
function hero(skill: HeroSkillCardView, overrides: Partial<BattleEntity> = {}): BattleEntity {
  return {
    id: "actor",
    side: "hero",
    hero: skill.hero ?? "ABOMINATION",
    skillIds: [skill.id],
    areaId: "a",
    stance: "defensive",
    wounds: 4,
    stress: 5,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: ["bleed-1"],
    blight: ["blight-1"],
    ...overrides,
  };
}
function monster(overrides: Partial<BattleEntity> = {}): BattleEntity {
  return {
    id: "target",
    side: "monster",
    hero: null,
    skillIds: [],
    areaId: "a",
    wounds: 0,
    dodge: 0,
    life: 20,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...overrides,
  };
}
function setup(skill: HeroSkillCardView, entities = [hero(skill), monster()]): BattleSetup {
  return {
    entities: entities.map((e) => (e.side === "monster" ? { ...e, monsterCardId: e.id } : e)),
    monsters: entities
      .filter((e) => e.side === "monster")
      .map((e) => ({
        id: e.id,
        life: e.life!,
        verification: { unverified: false },
        type_position_tags: ["Beast"],
        skills: [],
      })),
    skills: [skill],
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"] },
      { id: "b", elevation: "normal", adjacent: ["a"] },
    ],
  };
}
function play(skill: HeroSkillCardView, targetId = "target"): Command {
  return { type: "playHeroSkill", actorId: "actor", targetId, skillId: skill.id };
}

describe("applyCommand 战斗沙盒（R19–21、R-024、R-031、R-048）", () => {
  it("同种子和命令日志回放一致；伤害、反弹与死亡写回且不改入参", () => {
    const skill = card("p001");
    const actor = hero(skill);
    const target = monster({ life: 7, protection: true, riposte: true });
    const friend = hero(skill, { id: "friend", skillIds: [], hero: "HELLION", stress: 3 });
    const initial = createBattleState(1, setup(skill, [actor, target, friend]));
    const snapshot = structuredClone(initial);
    const commands = [play(skill), play(skill)];
    const replay = () =>
      commands.reduce((state, command) => applyCommand(state, command).state, initial);
    expect(replay()).toEqual(replay());
    const first = applyCommand(initial, commands[0]!);
    expect(first.events[0]).toMatchObject({ type: "heroSkillResolved", roll: 7 });
    expect(first.state.battle?.entities[0]?.wounds).toBe(8);
    expect(first.state.battle?.entities[1]).toMatchObject({ wounds: 4, dead: false });
    const second = applyCommand(first.state, commands[1]!);
    expect(second.events[0]).toMatchObject({ roll: 1 });
    expect(second.state.battle?.entities[1]).toMatchObject({ wounds: 8, dead: true });
    // Smite Crit 0：第二颗 1 仍为普通命中，光照 5 不加 Crit。
    expect(second.state.battle?.rngCursor).toBe(2);
    expect(initial).toEqual(snapshot);
  });

  it("暴击时使用者和同区其他英雄各减一次压力", () => {
    const skill = card("p022");
    const state = createBattleState(
      1,
      setup(skill, [
        hero(skill),
        monster(),
        hero(skill, { id: "friend", skillIds: [], stress: 3 }),
      ]),
    );
    const first = applyCommand(state, play(skill)).state;
    const second = applyCommand(first, play(skill));
    expect(second.events[0]).toMatchObject({ roll: 1, resolution: { outcome: "crit" } });
    expect(second.state.battle?.entities.map((entity) => entity.stress)).toEqual([4, undefined, 2]);
  });

  it("治疗与清除两种状态落到同一目标；Self 不覆盖自身治疗", () => {
    const skill = card("p139");
    const initial = createBattleState(1, setup(skill, [hero(skill, { stance: "support" })]));
    const result = applyCommand(initial, play(skill, "actor"));
    expect(result.events[0]).toMatchObject({ roll: 7, resolution: { effect: "heal" } });
    expect(result.state.battle?.entities[0]).toMatchObject({ wounds: 3, bleed: [], blight: [] });
  });

  it("无 Acc 自身移除与 Buff 一起生效，不消费 RNG", () => {
    const skill = card("p037");
    const initial = createBattleState(
      1,
      setup(skill, [
        hero(skill, {
          statusStacks: [
            { kind: "bleed", remaining: 2, amount: 1 },
            { kind: "blight", remaining: 2, amount: 1 },
          ],
        }),
      ]),
    );
    const result = applyCommand(initial, play(skill, "actor"));
    expect(result.events[0]).toMatchObject({
      type: "heroSkillResolved",
      roll: null,
      resolution: { outcome: null, skipped: [] },
    });
    expect(result.state.battle?.rngCursor).toBe(0);
    expect(result.state.battle?.entities[0]).toMatchObject({
      wounds: 4,
      bleed: [],
      blight: [],
      statusStacks: [{ kind: "buff", remaining: 3 }],
    });
  });

  it("同一英雄的自身减压、目标减压与暴击减压合并一次；压力最低为 0", () => {
    const skill = card("p121");
    const initial = createBattleState(1, setup(skill, [hero(skill, { stance: "support" })]));
    const first = applyCommand(initial, play(skill, "actor"));
    expect(first.state.battle?.entities[0]?.stress).toBe(3);
    const second = applyCommand(first.state, play(skill, "actor"));
    expect(second.events[0]).toMatchObject({ roll: 1, resolution: { outcome: "crit" } });
    expect(second.state.battle?.entities[0]?.stress).toBe(0);
  });

  it("已装备的 Transform 只写回形态，未命名治疗 / 压力不结算，也不消耗骰子", () => {
    const skill = card("p220");
    const initial = createBattleState(1, setup(skill, [hero(skill, { form: "human" })]));
    const result = applyCommand(initial, play(skill, "actor"));
    expect(result.events[0]).toMatchObject({ type: "heroSkillResolved", roll: null });
    expect(result.state.battle?.entities[0]).toMatchObject({ form: "beast", wounds: 4, stress: 5 });
    expect(result.state.battle?.rngCursor).toBe(0);
  });

  it("方向选择等待期间冻结命令和 RNG；有效选择写入位移意图与完整Stun续行", () => {
    const skill = card("p145");
    const fixture = setup(skill, [hero(skill), monster({ areaId: "b", shuffleResist: true })]);
    const state = createBattleState(1, {
      ...fixture,
      monsters: fixture.monsters!.map((m) => ({ ...m, resistances: [], immunities: [] })),
    });
    const waiting = applyCommand(state, play(skill));
    expect(waiting.pendingChoice?.options.map((option) => option.id)).toEqual(["push", "pull"]);
    expect(waiting.state.battle?.rngCursor).toBe(0);
    expect(waiting.state.battle?.entities).toEqual(state.battle?.entities);
    for (const command of [
      play(skill),
      { type: "ping", message: "locked" },
      { type: "resolveChoice", choiceId: "stale", optionId: "pull" },
      { type: "resolveChoice", choiceId: waiting.pendingChoice!.id, optionId: "other" },
    ] as Command[]) {
      const refused = applyCommand(waiting.state, command);
      expect(refused.state).toBe(waiting.state);
      expect(refused.pendingChoice).toEqual(waiting.pendingChoice);
    }
    const command: Command = {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "pull",
    };
    const done = applyCommand(waiting.state, command);
    expect(done).toEqual(applyCommand(waiting.state, command));
    expect(done.events[0]).toMatchObject({
      roll: 7,
      resolution: { outcome: "hit", damageDealt: null, skipped: [] },
    });
    expect(done.state.battle?.shuffleIntents).toEqual([
      { entityId: "target", relativeToId: "actor", move: { direction: "pull", distance: 1 } },
    ]);
    expect(done.state.battle?.entities[1]).toMatchObject({
      areaId: "b",
      wounds: 0,
      statusStacks: [{ kind: "stun", remaining: 1 }],
    });
    expect(done.pendingChoice).toBeUndefined();
    expect(done.state.battle?.pending).toBeNull();
    expect(applyCommand(done.state, command).state).toBe(done.state);
  });

  it("方向选择落空时不记目标位移", () => {
    const skill = card("p145");
    const state = createBattleState(
      1,
      setup(skill, [hero(skill), monster({ areaId: "b", dodge: 20 })]),
    );
    const done = applyCommand(state, { ...play(skill), shuffleChoice: "push" } as Command);
    expect(done.events[0]).toMatchObject({ resolution: { outcome: "miss" } });
    expect(done.state.battle?.shuffleIntents).toEqual([]);
  });

  it.each(["stance", "side", "guard", "range"])(
    "%s 拒绝与纯函数一致，整次不改状态与 RNG",
    (problem) => {
      const skill = card("p001");
      const actor = hero(skill, problem === "stance" ? { stance: "support" } : {});
      const target =
        problem === "side"
          ? hero(skill, { id: "target", skillIds: [] })
          : monster(problem === "range" ? { areaId: "b" } : {});
      const entities = [
        actor,
        target,
        ...(problem === "guard" ? [monster({ id: "guard", guard: true })] : []),
      ];
      const state = createBattleState(1, setup(skill, entities));
      const expected = resolveHeroSkill(
        skill,
        {
          actor,
          target: { ...target, monsterTypeTags: ["Beast"] },
          light: 5,
          areaDistance: problem === "range" ? 1 : 0,
          targetsInArea: 1,
          guardedEnemyOmitted: problem === "guard",
        },
        1,
      );
      const result = applyCommand(state, play(skill));
      expect(expected.status).toBe("refused");
      expect(result.events).toEqual([{ type: "commandRefused", message: expected.reason }]);
      expect(result.state).toBe(state);
    },
  );

  it("null 射程区间、缺少命名伤害和未验证卡均不通过接线", () => {
    for (const skill of [
      card("p146"),
      card("p004"),
      { ...card("p001"), verification: { unverified: true } },
    ]) {
      const state = createBattleState(1, setup(skill, [hero(skill), monster()]));
      const result = applyCommand(state, play(skill));
      expect(result.events[0]?.type).toBe("commandRefused");
      expect(result.state).toBe(state);
    }
  });

  it("非法实体、死亡目标与未装备技能不会触发掷骰", () => {
    const skill = card("p001");
    for (const entities of [
      [hero(skill), monster({ dead: true })],
      [hero(skill, { skillIds: [] }), monster()],
    ]) {
      const state = createBattleState(1, setup(skill, entities));
      expect(applyCommand(state, play(skill)).state).toBe(state);
    }
    const state = createBattleState(1, setup(skill));
    expect(applyCommand(state, play(skill, "unknown")).state).toBe(state);
  });

  it("选择一个 Guard 敌人不会因另一只 Guard 未被选中而误报漏选", () => {
    const skill = card("p001");
    const state = createBattleState(
      1,
      setup(skill, [hero(skill), monster({ guard: true }), monster({ id: "other", guard: true })]),
    );
    expect(applyCommand(state, play(skill)).events[0]?.type).toBe("heroSkillResolved");
  });
});
