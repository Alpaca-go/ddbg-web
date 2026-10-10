import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type {
  BattleEntity,
  GameState,
  MonsterCardView,
  PlayMonsterSkillCommand,
  SkillSegment,
  SkillStance,
} from "./index";

const cards = (
  JSON.parse(
    readFileSync(
      new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
      "utf8",
    ),
  ) as { cards: MonsterCardView[] }
).cards;
const soldier = cards.find((card) => card.id === "monster_medium:p001")!;
const defender = cards.find((card) => card.id === "monster_medium:p010")!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
function setup(card = soldier, extras: readonly BattleEntity[] = []): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    hero: "CRUSADER",
    skillIds: [],
    areaId: index < 2 ? "a" : "e",
    stance,
    wounds: 1,
    stress: index === 0 ? 5 : 3,
    dodge: 1,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  return createBattleState(1, {
    entities: [
      ...heroes,
      {
        id: "monster",
        side: "monster",
        hero: null,
        skillIds: [],
        areaId: "b",
        stance: card === defender ? "ranged" : "aggressive",
        stanceSlots: 1,
        monsterCardId: card.id,
        wounds: 0,
        life: card.life,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
      ...extras,
    ],
    monsters: [card],
    skills: [],
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b", "e"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "e", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
}
function play(slot = 1): PlayMonsterSkillCommand {
  return { type: "playMonsterSkill", actorId: "monster", targetId: "h0", skillSlot: slot };
}
function entity(state: GameState, id: string) {
  return state.battle!.entities.find((entry) => entry.id === id)!;
}
function patch(state: GameState, id: string, changes: Partial<BattleEntity>): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    },
  };
}
function monsterTurn(initial: GameState): GameState {
  let state = applyCommand(initial, { type: "startBattle" }).state;
  for (let index = 0; index < 8; index += 1) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    const turn = state.battle!.encounter!.turn;
    if (turn.type === "monster") {
      if (turn.actorId === "monster") return state;
      state = applyCommand(state, { type: "finishMonsterTurn", actorId: turn.actorId }).state;
    } else if (turn.type === "hero") {
      const direction =
        entity(state, turn.actorId).stance === "aggressive" ? "backward" : "forward";
      state = applyCommand(state, { type: "changeStance", actorId: turn.actorId, direction }).state;
      state = applyCommand(state, {
        type: "changeStance",
        actorId: turn.actorId,
        direction: direction === "forward" ? "backward" : "forward",
      }).state;
    } else throw new Error("没有怪物回合");
  }
  throw new Error("先攻没有抽到怪物");
}
function directionCard(): MonsterCardView {
  // 仅用于路由测试的合成效果，不写入游戏数据或宣称官方卡有此效果。
  const effect: readonly SkillSegment[] = [
    { type: "icon", icon: { key: "target_effects", naming: "confirmed" } },
    { type: "icon", icon: { key: "shuffle", naming: "confirmed" } },
    { type: "text", text: "Push 1 or Pull 1" },
  ];
  const skill = soldier.skills[0]!;
  return {
    ...soldier,
    skills: [{ ...skill, effect_lines: [effect], lines: [...skill.lines, effect] }],
  };
}

describe("已选怪物行动命令（R19–24、R-017、R-020、R-030、R-031）", () => {
  it("真实 Bone Soldier 命中伤口写回，共享 RNG，回放一致且不改入参", () => {
    const initial = setup();
    const copy = structuredClone(initial);
    const first = applyCommand(initial, play());
    expect(first.events[0]).toMatchObject({
      type: "monsterSkillResolved",
      roll: 7,
      resolution: { outcome: "hit", damageDealt: 5 },
    });
    expect(entity(first.state, "h0").wounds).toBe(6);
    expect(first.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(first.state, play()).events[0]).toMatchObject({
      roll: 1,
      resolution: { outcome: "crit" },
    });
    const replay = () =>
      [play(), play()].reduce((state, command) => applyCommand(state, command).state, initial);
    expect(replay()).toEqual(replay());
    expect(initial).toEqual(copy);
  });

  it("遭遇战只允许当前怪物，命中或落空都结束一次回合，不能重复攻击", () => {
    const waiting = applyCommand(setup(), play()).state;
    expect(waiting.battle!.encounter).toBeUndefined();
    const started = applyCommand(setup(), { type: "startBattle" }).state;
    expect(applyCommand(started, play()).state).toBe(started);
    const turn = patch(monsterTurn(setup()), "h0", { dodge: 100 });
    const result = applyCommand(turn, play());
    expect(result.events[0]).toMatchObject({ resolution: { outcome: "miss" } });
    expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(applyCommand(result.state, play()).state).toBe(result.state);
    expect(
      applyCommand(result.state, { type: "finishMonsterTurn", actorId: "monster" }).state,
    ).toBe(result.state);
  });

  it("暴击与低光照压力写回受击者和同区未选英雄，怪物不获得减压", () => {
    const initial = setup();
    const result = applyCommand(
      { ...initial, battle: { ...initial.battle!, light: 2, rngCursor: 1 } },
      play(),
    );
    expect(result.events[0]).toMatchObject({
      roll: 1,
      resolution: { outcome: "crit", actorStress: null },
    });
    expect(entity(result.state, "h0").stress).toBe(7);
    expect(entity(result.state, "h1").stress).toBe(5);
    expect(entity(result.state, "h2").stress).toBe(3);
    expect(entity(result.state, "monster").stress).toBeUndefined();
  });

  it("R22 自身 Pull 1 即使落空也移动，位移结束后才续接怪物回合", () => {
    const turn = patch(monsterTurn(setup(defender)), "h0", { dodge: 100 });
    const rolled = applyCommand(turn, play(3));
    expect(rolled.events[0]).toMatchObject({
      resolution: { outcome: "miss", actorShuffle: { direction: "pull", distance: 1 } },
    });
    expect(rolled.state.battle!.encounter!.turn.type).toBe("monster");
    expect(
      applyCommand(rolled.state, { type: "finishMonsterTurn", actorId: "monster" }).state,
    ).toBe(rolled.state);
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(entity(done.state, "monster")).toMatchObject({ areaId: "a", stance: "defensive" });
    expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor);
    expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it("怪物自身位移照常扣抗性一次，不采用英雄可忽略自身抗性的例外", () => {
    const initial = patch(setup(defender), "monster", { shuffleResist: true });
    const rolled = applyCommand(initial, play(3));
    expect(rolled.events[0]).toMatchObject({
      resolution: { actorShuffle: { direction: "pull", distance: 0 } },
    });
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(entity(done.state, "monster")).toMatchObject({ areaId: "b", stance: "ranged" });
    expect(done.state.battle!.shuffleIntents).toEqual([]);
  });

  it("反弹杀死攻击怪物，补位只改姿态；最后一只死亡时胜利", () => {
    const base = setup();
    const other = { ...entity(base, "monster"), id: "other", stance: "defensive" as const };
    const turn = patch(
      patch(monsterTurn(setup(soldier, [other])), "monster", { wounds: soldier.life - 1 }),
      "h0",
      { riposte: true },
    );
    const result = applyCommand(turn, play());
    expect(entity(result.state, "monster").dead).toBe(true);
    expect(entity(result.state, "other")).toMatchObject({ stance: "aggressive", areaId: "b" });
    const last = patch(patch(monsterTurn(setup()), "monster", { wounds: soldier.life - 1 }), "h0", {
      riposte: true,
    });
    const hit = { ...last, battle: { ...last.battle!, rngCursor: 1 } };
    expect(applyCommand(hit, play()).state.battle!.encounter!.turn).toEqual({
      type: "finished",
      outcome: "victory",
    });
  });

  it("自身位移先于反弹死亡；位移后不会复活，随后结束战斗", () => {
    const turn = patch(
      patch(monsterTurn(setup(defender)), "monster", { wounds: defender.life - 1 }),
      "h0",
      { riposte: true, dodge: 0 },
    );
    const prepared = { ...turn, battle: { ...turn.battle!, rngCursor: 1 } };
    const rolled = applyCommand(prepared, play(3));
    expect(entity(rolled.state, "monster").dead).toBe(true);
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(done.events[0]).toMatchObject({ type: "shuffleResolved", path: ["a"] });
    expect(entity(done.state, "monster")).toMatchObject({
      dead: true,
      areaId: "a",
      stance: "defensive",
    });
    expect(done.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
  });

  it("方向与落点选择交给受击英雄；分岔冻结命令且不重新掷骰", () => {
    const initial = setup(directionCard());
    const direction = applyCommand(initial, play());
    expect(direction.pendingChoice).toMatchObject({
      actorId: "h0",
      options: [{ id: "push" }, { id: "pull" }],
    });
    expect(direction.state.battle!.rngCursor).toBe(0);
    const rolled = applyCommand(direction.state, {
      type: "resolveChoice",
      choiceId: direction.pendingChoice!.id,
      optionId: "push",
    });
    // 从怪物 b 推开 a 中的英雄，可到 e；增加一个对称分岔以验证选择归属。
    const withBranch = {
      ...rolled.state,
      battle: {
        ...rolled.state.battle!,
        areas: [
          ...rolled.state.battle!.areas.map((area) =>
            area.id === "a" ? { ...area, adjacent: [...area.adjacent, "f"] } : area,
          ),
          { id: "f", elevation: "normal" as const, adjacent: ["a"], capacity: 8 },
        ],
      },
    };
    const waiting = applyCommand(withBranch, { type: "resolveShuffles" });
    expect(waiting.pendingChoice).toMatchObject({
      actorId: "h0",
      options: [{ id: "e" }, { id: "f" }],
    });
    expect(applyCommand(waiting.state, play()).state).toBe(waiting.state);
    const done = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "f",
    });
    expect(entity(done.state, "h0")).toMatchObject({ areaId: "f", stance: "defensive" });
    expect(done.state.battle!.rngCursor).toBe(1);
  });

  it("怪物暴击位移后按受击者最终区域加压，旧同区名单不重复生效", () => {
    const initial = setup(directionCard());
    const prepared = { ...initial, battle: { ...initial.battle!, rngCursor: 1 } };
    const rolled = applyCommand(prepared, { ...play(), shuffleChoice: "push" });
    expect(rolled.events[0]).toMatchObject({ resolution: { outcome: "crit" } });
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(entity(done.state, "h0")).toMatchObject({ areaId: "e", stress: 6 });
    expect(entity(done.state, "h1").stress).toBe(3);
    expect(entity(done.state, "h2").stress).toBe(4);
    expect(entity(done.state, "h3").stress).toBe(4);
    expect(done.events.filter((event) => event.type === "monsterCritAreaResolved")).toHaveLength(1);
    expect(done.state.battle!.rngCursor).toBe(2);
  });

  it("拒绝未知关联、Life 不一致、未核实技能、Guard 与射程；不消耗 RNG", () => {
    const initial = setup();
    const unverified = {
      ...initial,
      battle: {
        ...initial.battle!,
        monsters: [{ ...soldier, verification: { unverified: true } }],
      },
    };
    for (const state of [
      patch(initial, "monster", { monsterCardId: "unknown" }),
      patch(initial, "monster", { life: 999 }),
      patch(initial, "h1", { guard: true }),
      patch(initial, "h0", { areaId: "e" }),
      unverified,
    ]) {
      const result = applyCommand(state, play());
      expect(result.events[0]?.type).toBe("commandRefused");
      expect(result.state).toBe(state);
    }
    expect(applyCommand(initial, play(4)).state).toBe(initial);
    expect(applyCommand(initial, { ...play(), targetId: "monster" }).state).toBe(initial);
    expect(() =>
      createBattleState(1, {
        ...initial.battle!,
        entities: initial.battle!.entities.map((entry) =>
          entry.id === "monster" ? { ...entry, life: 999 } : entry,
        ),
      }),
    ).toThrow();
  });
});

// 合成分组只测试接线路由；不是 Soldier / 方向夹具的实际卡面转录。
function eligible(card = soldier, roll = false): MonsterCardView {
  return {
    ...card,
    stanceGroups: [
      {
        stances: [...stances],
        ...(roll ? { rollTable: [{ min: 1, max: 10, skill: 1 }] } : { skill: 1 }),
      },
    ],
  };
}
const prepare = { type: "prepareMonsterAction", actorId: "monster" } as const;

describe("怪物选招与目标命令接线（R-015、R-024）", () => {
  it("固定技能不掷选招骰，按真实 Most Wounded 选目标，不消耗回合", () => {
    const initial = patch(monsterTurn(setup(eligible())), "h1", { wounds: 4 });
    const before = structuredClone(initial);
    const result = applyCommand(initial, prepare);
    expect(result.events).toEqual([
      {
        type: "monsterActionPrepared",
        message: "已按姿态选招并确定英雄目标",
        actorId: "monster",
        skillSlot: 1,
        targetId: "h1",
        selectionRoll: null,
      },
    ]);
    expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(result.state.battle!.encounter).toEqual(initial.battle!.encounter);
    expect(initial).toEqual(before);
    expect(applyCommand(result.state, play()).state).toBe(result.state);
    expect(applyCommand(result.state, { ...play(), targetId: "h1" }).events[0]?.type).toBe(
      "monsterSkillResolved",
    );
  });

  it("选招与攻击使用共享 RNG；重复选招拒绝，完整命令回放一致", () => {
    const initial = monsterTurn(setup(eligible(soldier, true)));
    const chosen = applyCommand(initial, prepare);
    expect(chosen.events[0]).toMatchObject({
      type: "monsterActionPrepared",
      skillSlot: 1,
      targetId: "h0",
    });
    expect(chosen.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
    expect(chosen.state.battle!.monsterAction!.selectionRoll).toBeGreaterThanOrEqual(1);
    expect(applyCommand(chosen.state, prepare).state).toBe(chosen.state);
    const fired = applyCommand(chosen.state, play());
    expect(fired.events[0]?.type).toBe("monsterSkillResolved");
    expect(fired.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 2);
    expect(fired.state.battle!.monsterAction).toBeNull();
    expect(fired.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(applyCommand(applyCommand(initial, prepare).state, play())).toEqual(fired);
  });

  it("R22 Defender 远程固定技能 3，Furthest 平手按姿态选 h2", () => {
    const card: MonsterCardView = {
      ...defender,
      stanceGroups: [
        {
          stances: ["aggressive", "defensive"],
          rollTable: [
            { min: 1, max: 5, skill: 2 },
            { min: 6, max: 10, skill: 1 },
          ],
        },
        { stances: ["ranged", "support"], skill: 3 },
      ],
    };
    const initial = monsterTurn(patch(setup(card), "monster", { stance: "ranged" }));
    const result = applyCommand(initial, prepare);
    expect(result.state.battle!.monsterAction).toEqual({
      actorId: "monster",
      skillSlot: 3,
      targetId: "h2",
      selectionRoll: null,
    });
    expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(applyCommand(result.state, { ...play(1), targetId: "h2" }).state).toBe(result.state);
  });

  it("大型怪使用较高优先级姿态；Guard 覆盖技能目标优先级", () => {
    const initial = patch(
      patch(monsterTurn(setup(eligible())), "monster", { stanceSlots: 2 }),
      "h3",
      { guard: true },
    );
    const result = applyCommand(initial, prepare);
    expect(result.state.battle!.monsterAction).toMatchObject({ skillSlot: 1, targetId: "h3" });
  });

  it("方向 / 区域选择保存选招结果，不重掷选招骰或绕过目标约束", () => {
    const initial = monsterTurn(setup(eligible(directionCard(), true)));
    const chosen = applyCommand(initial, prepare);
    const waiting = applyCommand(chosen.state, play());
    expect(waiting.pendingChoice?.actorId).toBe("h0");
    expect(waiting.state.battle!.monsterAction).toEqual(chosen.state.battle!.monsterAction);
    expect(waiting.state.battle!.rngCursor).toBe(chosen.state.battle!.rngCursor);
    expect(applyCommand(waiting.state, prepare).state).toBe(waiting.state);
    const rolled = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "push",
    });
    expect(rolled.state.battle!.rngCursor).toBe(chosen.state.battle!.rngCursor + 1);
    expect(rolled.state.battle!.monsterAction).toBeNull();
    expect(applyCommand(rolled.state, prepare).state).toBe(rolled.state);
    const completed = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(completed.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(completed.state.battle!.monsterAction).toBeNull();
  });

  it("选定 Guard 够不到时保存原选招；攻击拒绝不换人、不重掷", () => {
    const initial = patch(monsterTurn(setup(eligible(soldier, true))), "h3", { guard: true });
    const chosen = applyCommand(initial, prepare);
    expect(chosen.state.battle!.monsterAction?.targetId).toBe("h3");
    expect(applyCommand(chosen.state, { ...play(), targetId: "h3" }).state).toBe(chosen.state);
    expect(applyCommand(chosen.state, play()).state).toBe(chosen.state);
    expect(applyCommand(chosen.state, prepare).state).toBe(chosen.state);
    const skipped = applyCommand(chosen.state, { type: "finishMonsterTurn", actorId: "monster" });
    expect(skipped.state.battle!.monsterAction).toBeNull();
    expect(skipped.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it("未开始 / 非当前回合、缺少分组或未核实目标均拒绝且不消耗 RNG", () => {
    const missingGroups = { ...soldier };
    delete missingGroups.stanceGroups;
    const noGroups = monsterTurn(setup(missingGroups));
    const card = eligible(soldier, true);
    const unsupported = {
      ...card,
      skills: card.skills.map((skill) => ({ ...skill, target: "Crowded" })),
    };
    for (const initial of [
      setup(card),
      applyCommand(setup(card), { type: "startBattle" }).state,
      noGroups,
      monsterTurn(setup(unsupported)),
    ]) {
      const result = applyCommand(initial, prepare);
      expect(result.state).toBe(initial);
      expect(result.events[0]?.type).toBe("commandRefused");
    }
    expect(applyCommand(noGroups, { ...prepare, actorId: "h0" }).state).toBe(noGroups);
  });
});
