import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type {
  BattleEntity,
  GameState,
  HeroSkillCardView,
  PlayHeroSkillTargetsCommand,
} from "./index";

const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../../data/normalized/corebox/${name}.json`, import.meta.url), "utf8"),
  );
const cards = read("hero_skill").cards as HeroSkillCardView[];
const card = (id: string) => cards.find((c) => c.id === `hero_skill:${id}`)!;
const daggers = card("p175");
const comfort = card("p097");
const soldier = read("monster_medium").cards[0];
const stats = read("hero_stat").cards.filter(
  (c: { attributesVerified: boolean; level: number }) => c.attributesVerified && c.level === 1,
);
function hero(
  id: string,
  name: string,
  stance: NonNullable<BattleEntity["stance"]>,
  areaId = "a",
): BattleEntity {
  return {
    id,
    hero: name,
    side: "hero",
    stance,
    areaId,
    skillIds: [],
    wounds: 5,
    stress: 5,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
}
function setup(skill = daggers, withLife = false): GameState {
  // 明确手动布置：生命取获批数据；位置、压力、Dodge 和回合入口为场景夹具。
  const heroes =
    skill.hero === "VESTAL"
      ? [
          hero("actor", "VESTAL", "support"),
          hero("h1", "CRUSADER", "aggressive", "b"),
          hero("h2", "HELLION", "defensive", "b"),
          hero("h3", "HIGHWAYMAN", "ranged", "b"),
        ]
      : [
          hero("actor", skill.hero!, "defensive"),
          hero("h1", "CRUSADER", "aggressive"),
          hero("h2", "HELLION", "ranged", "b"),
          hero("h3", "VESTAL", "support", "b"),
        ];
  const monsters: BattleEntity[] = ["m1", "m2", "m3"].map((id, i) => ({
    id,
    hero: null,
    side: "monster",
    stance: (["aggressive", "defensive", "ranged"] as const)[i]!,
    areaId: "b",
    life: soldier.life,
    monsterCardId: soldier.id,
    stanceSlots: 1,
    wounds: 0,
    dodge: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const state = createBattleState(1, {
    entities: [
      ...heroes.map((h, i) => ({
        ...h,
        skillIds: i === 0 ? [skill.id] : [],
        ...(withLife
          ? {
              life: stats.find((s: { name: string }) => s.name === h.hero).life,
              heroStatId: stats.find((s: { name: string }) => s.name === h.hero).id,
            }
          : {}),
      })),
      ...monsters,
    ],
    heroStats: stats,
    skills: [skill],
    monsters: [soldier],
    light: 5,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 8, elevation: "normal" },
      { id: "b", adjacent: ["a"], capacity: 8, elevation: "normal" },
    ],
  });
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "actor", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const command = (skill = daggers, targetIds = ["m1", "m2"]): PlayHeroSkillTargetsCommand => ({
  type: "playHeroSkillTargets",
  actorId: "actor",
  skillId: skill.id,
  targetIds,
});
function change(state: GameState, id: string, fields: Partial<BattleEntity>): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) => (e.id === id ? { ...e, ...fields } : e)),
    },
  };
}
const entity = (state: GameState, id: string) => state.battle!.entities.find((e) => e.id === id)!;
function refused(state: GameState, cmd = command()) {
  const result = applyCommand(state, cmd);
  expect(result.state).toBe(state);
  expect(result.events).toMatchObject([{ type: "commandRefused" }]);
  return result;
}

describe("英雄多目标命令（R19–20、R-024、R-025、R-031、R-048）", () => {
  it("真实 Breakthrough 自身 Pull 只一次，位移完成才扣一次行动", () => {
    const skill = card("p034");
    let state = change(setup(skill), "actor", { stance: "ranged" });
    state = change(state, "h2", { stance: "defensive" });
    const played = applyCommand(state, command(skill, ["m1", "m2", "m3"]));
    expect(played.state.battle!.shuffleIntents).toHaveLength(1);
    expect(played.state.battle!.encounter!.turn).toMatchObject({ actions: 2 });
    expect(applyCommand(played.state, command(skill)).state).toBe(played.state);
    const moved = applyCommand(played.state, { type: "resolveShuffles" });
    expect(moved.events.filter((e) => e.type === "shuffleResolved")).toHaveLength(1);
    expect(entity(moved.state, "actor")).toMatchObject({ areaId: "b", stance: "defensive" });
    expect(moved.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [skill.id],
    });
    expect(moved.state.battle!.rngCursor).toBe(played.state.battle!.rngCursor);
    expect(applyCommand(moved.state, { type: "resolveShuffles" }).state).toBe(moved.state);
  });

  it("多目标暴击按自身位移后区域减压一次，末批死亡先保留自身位移", () => {
    const skill = card("p034");
    let state = change(setup(skill), "actor", { stance: "ranged", buffStacks: 2 });
    state = change(state, "h2", { stance: "defensive" });
    for (const id of ["m1", "m2", "m3"]) state = change(state, id, { wounds: 3 });
    state = { ...state, seed: 0 };
    // 种子夹具寻找低于修正后 Crit 的同一颗骰；不改卡牌数值。
    while (
      !applyCommand(state, command(skill, ["m1", "m2", "m3"])).events.some(
        (e) =>
          e.type === "heroSkillTargetsResolved" && e.resolutions.some((r) => r.outcome === "crit"),
      )
    )
      state = { ...state, seed: state.seed + 1 };
    const played = applyCommand(state, command(skill, ["m1", "m2", "m3"]));
    const moved = applyCommand(played.state, { type: "resolveShuffles" });
    expect(moved.events.find((e) => e.type === "commandRefused")).toBeUndefined();
    expect(entity(moved.state, "actor").areaId).toBe("b");
    expect(entity(moved.state, "h1").stress).toBe(5);
    expect(entity(moved.state, "h2").stress).toBe(4);
    expect(entity(moved.state, "h3").stress).toBe(4);
    expect(entity(moved.state, "actor").stress).toBe(4);
    expect(moved.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
    expect(moved.state.battle!.rngCursor).toBe(played.state.battle!.rngCursor);
  });

  it("自身位移先于整批目标死亡：当时已满的区域不能因先写死亡而腾出容量", () => {
    const skill = card("p034");
    let state = change(setup(skill), "actor", { stance: "ranged" });
    state = change(state, "h2", { stance: "defensive" });
    for (const id of ["m1", "m2", "m3"]) state = change(state, id, { wounds: 3 });
    state = {
      ...state,
      battle: {
        ...state.battle!,
        areas: state.battle!.areas.map((a) => (a.id === "b" ? { ...a, capacity: 5 } : a)),
      },
    };
    const played = applyCommand(state, command(skill, ["m1", "m2", "m3"]));
    const moved = applyCommand(played.state, { type: "resolveShuffles" });
    expect(entity(moved.state, "actor")).toMatchObject({ areaId: "a", stance: "defensive" });
    expect(moved.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
  });
  it("同一颗 7 对不同 Dodge 分别命中 / 落空，只扣一行动且可确定性回放", () => {
    const state = change(setup(), "m2", { dodge: 7 });
    const original = structuredClone(state);
    const result = applyCommand(state, command());
    expect(result.events[0]).toMatchObject({
      type: "heroSkillTargetsResolved",
      roll: 7,
      resolutions: [
        { targetId: "m1", outcome: "hit", damageDealt: 3 },
        { targetId: "m2", outcome: "miss" },
      ],
    });
    expect(entity(result.state, "m1").wounds).toBe(3);
    expect(entity(result.state, "m2").wounds).toBe(0);
    expect(result.state.battle).toMatchObject({
      rngCursor: 1,
      encounter: { turn: { actions: 1, usedSkillIds: [daggers.id] } },
    });
    expect(applyCommand(state, command())).toEqual(result);
    expect(state).toEqual(original);
    refused(result.state);
  });

  it("全部落空仍只扣一个行动，允许再次使用；第二行动正常结束回合", () => {
    const state = change(change(setup(), "m1", { dodge: 20 }), "m2", { dodge: 20 });
    const first = applyCommand(state, command());
    expect(first.state.battle!.encounter!.turn).toMatchObject({ actions: 1, usedSkillIds: [] });
    const second = applyCommand(first.state, command());
    expect(second.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(second.state.battle!.rngCursor).toBe(2);
    expect(second.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  });

  it.each(["m1", "m2"])("仅 %s 暴击时仍减压一次，不被其他目标命中覆盖", (id) => {
    const state = change(setup(), id, { debuffStacks: 7 });
    const result = applyCommand(state, command());
    expect(entity(result.state, "actor").stress).toBe(4);
    expect(entity(result.state, "h1").stress).toBe(4);
    expect(entity(result.state, "h2").stress).toBe(5);
    expect(result.state.battle!.rngCursor).toBe(1);
  });

  it("两个暴击杀死两只怪物，压力不重复，统一补姿态空位", () => {
    let state = change(change(setup(), "m1", { wounds: 1 }), "m2", { wounds: 1 });
    state = { ...state, battle: { ...state.battle!, rngCursor: 1, light: 4 } };
    const result = applyCommand(state, command());
    expect(entity(result.state, "m1").dead).toBe(true);
    expect(entity(result.state, "m2").dead).toBe(true);
    expect(entity(result.state, "m3")).toMatchObject({
      stance: "aggressive",
      areaId: "b",
      dead: false,
    });
    expect(entity(result.state, "actor").stress).toBe(4);
    expect(result.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(2);
    expect(result.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    const reverse = applyCommand(state, command(daggers, ["m2", "m1"]));
    expect(reverse.state).toEqual(result.state);
    state = change(state, "m3", { dead: true });
    const win = applyCommand(state, command());
    expect(win.state.battle!.encounter!.turn).toMatchObject({
      type: "finished",
      outcome: "victory",
    });
    expect(win.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
  });

  it("Guard 约束看整组选中目标；选中另一只 Guard 时普通目标仍能结算", () => {
    const state = change(setup(), "m2", { guard: true });
    expect(applyCommand(state, command()).events[0]?.type).toBe("heroSkillTargetsResolved");
    refused(state, command(daggers, ["m1", "m3"]));
  });

  it("Divine Comfort 三目标治疗与自身治疗各执行一次，使用获批 Life", () => {
    const state = { ...setup(comfort, true), seed: 0 };
    const result = applyCommand(state, command(comfort, ["h1", "h2", "h3"]));
    expect(result.events[0]).toMatchObject({ roll: 3 });
    expect(entity(result.state, "actor")).toMatchObject({ wounds: 3, stress: 4 });
    for (const id of ["h1", "h2", "h3"])
      expect(entity(result.state, id)).toMatchObject({ wounds: 2, stress: 5 });
    expect(result.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(4);
    expect(result.state.battle!.rngCursor).toBe(1);
  });

  it("官方 R20 黄金示例：Divine Comfort II 掷 2，自疗 3，三名友方各治疗 4", () => {
    const skill = card("p098");
    const state = { ...setup(skill, true), seed: 8 };
    const result = applyCommand(state, command(skill, ["h1", "h2", "h3"]));
    expect(result.events[0]).toMatchObject({
      roll: 2,
      resolutions: [
        { outcome: "crit", printedAmount: 4 },
        { outcome: "crit", printedAmount: 4 },
        { outcome: "crit", printedAmount: 4 },
      ],
    });
    expect(entity(result.state, "actor")).toMatchObject({ wounds: 2, stress: 4 });
    for (const id of ["h1", "h2", "h3"]) expect(entity(result.state, id).wounds).toBe(1);
    expect(result.state.battle!.rngCursor).toBe(1);
  });

  it("多目标反击各自累计，Protection 按减半前伤害反弹；落空不反弹", () => {
    let state = change(setup(), "m1", { riposte: true, protection: true });
    state = change(state, "m2", { riposte: true });
    const result = applyCommand(state, command());
    const event = result.events.find((e) => e.type === "heroSkillTargetsResolved")!;
    const reflected = event.resolutions.reduce((sum, r) => sum + (r.riposteDamage ?? 0), 0);
    expect(reflected).toBeGreaterThan(0);
    expect(entity(result.state, "actor").wounds).toBe(entity(state, "actor").wounds + reflected);
    expect(event.resolutions[0]!.riposteDamage).toBe(event.resolutions[1]!.riposteDamage);
    expect(event.resolutions[0]!.damageDealt).toBeLessThan(event.resolutions[1]!.damageDealt!);
    expect(result.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    const miss = applyCommand(change(state, "m2", { dodge: 20 }), command());
    expect(miss.events[0]).toMatchObject({
      resolutions: [{ riposteDamage: reflected / 2 }, { outcome: "miss", riposteDamage: null }],
    });
    expect(entity(miss.state, "actor").wounds).toBe(entity(state, "actor").wounds + reflected / 2);
    expect(applyCommand(state, command())).toEqual(result);
  });

  it("未轮到使用者与位移冻结均原子拒绝", () => {
    const state = setup();
    refused(state, { ...command(), actorId: "h1" });
    const pending = {
      type: "shuffleArea" as const,
      path: [],
      choice: {
        id: "test-choice",
        prompt: "场景待选",
        options: [{ id: "b", label: "区域 b" }],
      },
    };
    const frozen = { ...state, battle: { ...state.battle!, pending } };
    expect(refused(frozen).pendingChoice).toEqual(pending.choice);
    refused({
      ...state,
      battle: {
        ...state.battle!,
        shuffleIntents: [
          {
            entityId: "m1",
            relativeToId: "actor",
            move: { direction: "push", distance: 1 },
          },
        ],
      },
    });
  });

  it("友方治疗落空仍保留一次自身治疗，不漏掉其他目标命中", () => {
    const state = change(setup(comfort, true), "h1", { dodge: 20 });
    const result = applyCommand(state, command(comfort, ["h1", "h2"]));
    expect(result.events[0]).toMatchObject({
      roll: 7,
      resolutions: [{ outcome: "miss" }, { outcome: "hit" }],
    });
    expect(entity(result.state, "actor").wounds).toBe(3);
    expect(entity(result.state, "h1").wounds).toBe(5);
    expect(entity(result.state, "h2").wounds).toBe(3);
    expect(result.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(2);
  });

  it.each([[], ["m1", "m1"], ["m1", "missing"], ["m1", "m2", "m3"]].map((ids) => ({ ids })))(
    "非法目标集 $ids 原子拒绝",
    ({ ids }) => {
      refused(setup(), command(daggers, ids));
    },
  );

  it("跨区、死者、错误阵营、未验证卡和缺 duration 均不消费 RNG", () => {
    refused(change(setup(), "m2", { areaId: "a" }));
    refused(change(setup(), "m2", { dead: true }));
    refused(setup(), command(daggers, ["m1", "h2"]));
    const unverified = { ...daggers, verification: { unverified: true } };
    refused(setup(unverified), command(unverified));
    const statusSkill = card("p176");
    // 派生缺口夹具：删掉卡面 duration 文字，不能自动变成 1 回合。
    const missingDuration = {
      ...statusSkill,
      effect_lines: statusSkill.effect_lines.map((line) =>
        line.filter((segment) => segment.type !== "text" || !segment.text.includes("1t")),
      ),
    };
    for (const skill of [statusSkill, missingDuration]) {
      const state = change(setup(skill), "actor", { stance: "ranged" });
      expect(refused(state, command(skill)).events[0]?.message).toContain("多目标");
    }
  });
});
