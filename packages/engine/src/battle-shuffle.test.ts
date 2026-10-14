import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type { BattleEntity, Command, GameState, HeroSkillCardView, SkillStance } from "./index";

const cards = (
  JSON.parse(
    readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
  ) as { cards: HeroSkillCardView[] }
).cards;
const blast = cards.find((card) => card.id === "hero_skill:p145")!;
const pointBlank = cards.find((card) => card.id === "hero_skill:p070")!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
function setup(skill = blast, fourHeroes = false, monsterLife = 100): GameState {
  const hero: BattleEntity = {
    id: "hero",
    side: "hero",
    hero: skill.hero!,
    skillIds: [skill.id],
    areaId: "a",
    stance: skill === blast ? "defensive" : "aggressive",
    wounds: 0,
    stress: 3,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const monster: BattleEntity = {
    ...hero,
    id: "target",
    side: "monster",
    hero: null,
    skillIds: [],
    stance: "aggressive",
    stanceSlots: 1,
    life: monsterLife,
    areaId: skill === blast ? "b" : "a",
  };
  const { stress: _stress, ...enemy } = monster;
  void _stress;
  return createBattleState(1, {
    entities: [
      hero,
      ...(fourHeroes
        ? stances
            .filter((stance) => stance !== hero.stance)
            .map((stance, index) => ({ ...hero, id: `friend${index}`, skillIds: [], stance }))
        : []),
      enemy,
    ],
    skills: [skill],
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b", "e"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c", "d"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "d", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "e", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
}
function play(skill = blast): Command {
  return {
    type: "playHeroSkill",
    actorId: "hero",
    targetId: "target",
    skillId: skill.id,
    shuffleChoice: "push",
  };
}
function choose(state: GameState, optionId: string): Command {
  return { type: "resolveChoice", choiceId: state.battle!.pending!.choice.id, optionId };
}
function target(state: GameState) {
  return state.battle!.entities.find((entity) => entity.id === "target")!;
}
function heroTurn(initial: GameState): GameState {
  let state = applyCommand(initial, { type: "startBattle" }).state;
  for (let index = 0; index < 8; index += 1) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    const turn = state.battle!.encounter!.turn;
    if (turn.type === "monster") {
      state = applyCommand(state, { type: "finishMonsterTurn", actorId: turn.actorId }).state;
    } else if (turn.type === "hero") {
      if (turn.actorId === "hero") return state;
      const stance = state.battle!.entities.find((entity) => entity.id === turn.actorId)!.stance;
      const direction = stance === "aggressive" ? "backward" : "forward";
      state = applyCommand(state, { type: "changeStance", actorId: turn.actorId, direction }).state;
      state = applyCommand(state, {
        type: "changeStance",
        actorId: turn.actorId,
        direction: direction === "forward" ? "backward" : "forward",
      }).state;
    } else throw new Error("未找到英雄回合");
  }
  throw new Error("先攻未抽到英雄");
}

describe("applyCommand 位移接线（R20–21、R-020、R-025、R-030）", () => {
  it("多步分岔保留路径前缀和新 choiceId，不能复用上一层选择", () => {
    const initial = setup();
    const prepared = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: [
          ...initial.battle!.areas.map((area) =>
            area.id === "c" ? { ...area, adjacent: ["b", "f", "g"] } : area,
          ),
          { id: "f", elevation: "normal" as const, adjacent: ["c"], capacity: 8 },
          { id: "g", elevation: "normal" as const, adjacent: ["c"], capacity: 8 },
        ],
      },
    };
    const first = applyCommand(applyCommand(prepared, play()).state, { type: "resolveShuffles" });
    const second = applyCommand(first.state, choose(first.state, "c"));
    expect(second.pendingChoice!.id).not.toBe(first.pendingChoice!.id);
    expect(second.pendingChoice!.options.map((option) => option.id)).toEqual(["f", "g"]);
    expect(target(second.state).areaId).toBe("b");
    expect(applyCommand(second.state, choose(first.state, "c")).state).toBe(second.state);
    const done = applyCommand(second.state, choose(second.state, "g"));
    expect(target(done.state).areaId).toBe("g");
    expect(done.events[0]).toMatchObject({ path: ["c", "g"] });
    expect(done.state.battle!.rngCursor).toBe(1);
  });

  it("自身位移暴击按最终同区英雄减压，不重复减压且不保留旧区域奖励", () => {
    const initial = setup(pointBlank);
    const actor = initial.battle!.entities[0]!;
    const prepared = {
      ...initial,
      battle: {
        ...initial.battle!,
        rngCursor: 1,
        entities: [
          ...initial.battle!.entities,
          { ...actor, id: "oldFriend", stance: "defensive" as const, skillIds: [] },
          { ...actor, id: "newFriend", stance: "ranged" as const, areaId: "e", skillIds: [] },
        ],
      },
    };
    const rolled = applyCommand(prepared, play(pointBlank));
    expect(rolled.events[0]).toMatchObject({ roll: 1, resolution: { outcome: "crit" } });
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    const done = applyCommand(waiting.state, choose(waiting.state, "e"));
    expect(
      done.state
        .battle!.entities.filter((entity) => entity.side === "hero")
        .map((entity) => [entity.id, entity.stress]),
    ).toEqual([
      ["hero", 2],
      ["oldFriend", 3],
      ["newFriend", 2],
    ]);
    expect(done.events.filter((event) => event.type === "heroCritAreaResolved")).toHaveLength(1);
    expect(done.state.battle!.rngCursor).toBe(2);
  });

  it("满员截断后仍清除意图并应用姿态位移", () => {
    const initial = setup();
    const prepared = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: initial.battle!.areas.map((area) =>
          ["c", "d"].includes(area.id) ? { ...area, capacity: 0 } : area,
        ),
      },
    };
    const rolled = applyCommand(prepared, play());
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(target(done.state)).toMatchObject({ areaId: "b", stance: "ranged" });
    expect(done.state.battle!.shuffleIntents).toEqual([]);
    expect(done.events[0]).toMatchObject({ path: [], stanceSteps: 2 });
  });

  it("自身分岔续接保留当前形态与状态，随后只提交一次目标伤害", () => {
    const initial = setup(pointBlank);
    const prepared = { ...initial, battle: { ...initial.battle!, rngCursor: 1 } };
    const rolled = applyCommand(prepared, play(pointBlank));
    // 模拟后续生命应用层完成的结果；不开放沙盒 Life 入参或增加卡牌数值。
    const applied: GameState = {
      ...rolled.state,
      battle: {
        ...rolled.state.battle!,
        entities: rolled.state.battle!.entities.map((entry) => ({
          ...entry,
          wounds: 2,
          form: "beast",
          bleed: ["preserved-bleed"],
          blight: ["preserved-blight"],
          buffStacks: 1,
          guard: true,
        })),
      },
    };
    const snapshot = structuredClone(applied);
    const waiting = applyCommand(applied, { type: "resolveShuffles" });
    expect(waiting.pendingChoice).toBeDefined();
    expect(waiting.state.battle!.entities).toEqual(applied.battle!.entities);
    const done = applyCommand(waiting.state, choose(waiting.state, "e"));
    for (const before of applied.battle!.entities) {
      const after = done.state.battle!.entities.find((entry) => entry.id === before.id)!;
      const {
        stress: _beforeStress,
        areaId: _beforeArea,
        stance: _beforeStance,
        ...healthBefore
      } = before;
      const {
        stress: _afterStress,
        areaId: _afterArea,
        stance: _afterStance,
        ...healthAfter
      } = after;
      void [_beforeStress, _beforeArea, _beforeStance, _afterStress, _afterArea, _afterStance];
      expect(healthAfter).toEqual(
        before.id === "target" ? { ...healthBefore, wounds: before.wounds + 15 } : healthBefore,
      );
    }
    expect(done.state.battle!.entities[0]).toMatchObject({ areaId: "e", stress: 2 });
    expect(done.state.battle!.rngCursor).toBe(applied.battle!.rngCursor);
    expect(
      done.events.filter(
        (event) => event.type === "heroSkillResolved" && event.phase !== "ownPending",
      ),
    ).toHaveLength(1);
    expect(applyCommand(done.state, { type: "resolveShuffles" }).state).toBe(done.state);
    expect(applied).toEqual(snapshot);
    expect(applyCommand(waiting.state, choose(waiting.state, "e"))).toEqual(done);
  });

  it("自身位移前不提交目标死亡，位移后伤害与胜利各结算一次", () => {
    const turn = heroTurn(setup(pointBlank, true, 1));
    const rolled = applyCommand(
      { ...turn, battle: { ...turn.battle!, rngCursor: 1 } },
      play(pointBlank),
    );
    const applied: GameState = {
      ...rolled.state,
      battle: {
        ...rolled.state.battle!,
        entities: rolled.state.battle!.entities.map((entry) =>
          entry.id === "target" ? { ...entry, wounds: 1 } : entry,
        ),
      },
    };
    // 此处锁定暴击路径，保留原事件伤口与状态中封顶后的伤口各自的含义。
    const continuation = applied.battle!.shuffleContinuation!;
    expect(continuation.type).toBe("heroSkillResolved");
    if (continuation.type !== "heroSkillResolved") throw new Error("应为有目标技能");
    expect(continuation.resolution.outcome).toBe("crit");
    const waiting = applyCommand(applied, { type: "resolveShuffles" });
    const done = applyCommand(waiting.state, choose(waiting.state, "e"));
    expect(target(rolled.state)).toMatchObject({ dead: false, wounds: 0 });
    expect(target(done.state)).toMatchObject({ dead: true, wounds: 16 });
    expect(done.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(done.events.filter((event) => event.type === "battleFinished")).toHaveLength(1);
  });

  it("方向选择后掷骰一次，区域选择不再消耗 RNG；等待期间所有其他命令冻结", () => {
    const initial = setup();
    const waiting = applyCommand(initial, {
      type: "playHeroSkill",
      actorId: "hero",
      targetId: "target",
      skillId: blast.id,
    });
    const rolled = applyCommand(waiting.state, choose(waiting.state, "push"));
    expect(rolled.events[0]).toMatchObject({ type: "heroSkillResolved", roll: 7 });
    const moving = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(moving.pendingChoice).toMatchObject({
      actorId: "hero",
      options: [{ id: "c" }, { id: "d" }],
    });
    expect(target(moving.state).areaId).toBe("b");
    for (const command of [
      play(),
      { type: "ping", message: "locked" },
      { type: "drawInitiative" },
      { type: "resolveShuffles" },
      choose(moving.state, "a"),
      { ...choose(moving.state, "c"), choiceId: "stale" },
    ] as Command[]) {
      const rejected = applyCommand(moving.state, command);
      expect(rejected.state).toBe(moving.state);
      expect(rejected.pendingChoice).toEqual(moving.pendingChoice);
    }
    const done = applyCommand(moving.state, choose(moving.state, "c"));
    expect(target(done.state)).toMatchObject({ areaId: "c", stance: "ranged" });
    expect(done.events).toEqual([
      {
        type: "shuffleResolved",
        message: "区域与姿态位移已结算",
        entityId: "target",
        path: ["c"],
        stanceSteps: 2,
      },
    ]);
    expect(done.state.battle!.rngCursor).toBe(1);
    expect(done.state.battle!.shuffleContinuation).toBeNull();
    expect(done.state.battle!.shuffleIntents).toEqual([]);
    expect(applyCommand(done.state, choose(moving.state, "c")).state).toBe(done.state);
  });

  it("同种子和选择命令日志确定回放，不改入参", () => {
    const initial = setup();
    const snapshot = structuredClone(initial);
    const rolled = applyCommand(initial, play()).state;
    const waiting = applyCommand(rolled, { type: "resolveShuffles" });
    const commands: Command[] = [play(), { type: "resolveShuffles" }, choose(waiting.state, "d")];
    const replay = () =>
      commands.reduce((state, command) => applyCommand(state, command).state, initial);
    expect(replay()).toEqual(replay());
    expect(initial).toEqual(snapshot);
  });

  it("自身位移先应用，目标位移参照更新后的自身位置，事件只发一次", () => {
    const rolled = applyCommand(setup(pointBlank), play(pointBlank));
    expect(rolled.state.battle!.shuffleIntents.map((intent) => intent.entityId)).toEqual(["hero"]);
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(waiting.pendingChoice!.options.map((option) => option.id)).toEqual(["b", "e"]);
    const done = applyCommand(waiting.state, choose(waiting.state, "b"));
    expect(done.state.battle!.entities.find((entity) => entity.id === "hero")).toMatchObject({
      areaId: "b",
      stance: "defensive",
    });
    expect(target(done.state)).toMatchObject({ areaId: "e", stance: "defensive" });
    expect(done.events.filter((event) => event.type === "shuffleResolved")).toHaveLength(2);
    expect(
      done.events.filter(
        (event) => event.type === "heroSkillResolved" && event.phase !== "ownPending",
      ),
    ).toHaveLength(1);
  });

  it("最后一个行动遇到落点选择时，不提前结束回合；全部位移后只扣一次", () => {
    const initial = setup(pointBlank, true);
    const prepared = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "hero"
            ? { ...entity, stance: "defensive" as const }
            : entity.side === "hero" && entity.stance === "defensive"
              ? { ...entity, stance: "aggressive" as const }
              : entity,
        ),
      },
    };
    const state = applyCommand(heroTurn(prepared), {
      type: "changeStance",
      actorId: "hero",
      direction: "forward",
    }).state;
    const rolled = applyCommand(state, play(pointBlank));
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(waiting.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
    const done = applyCommand(waiting.state, choose(waiting.state, "b"));
    expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(done.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(applyCommand(done.state, { type: "resolveShuffles" }).state).toBe(done.state);
  });

  it("目标死亡跳过目标位移，自身位移完成后才胜利；不复活参照目标", () => {
    const rolled = applyCommand(heroTurn(setup(pointBlank, true, 1)), play(pointBlank));
    expect(target(rolled.state).dead).toBe(false);
    expect(rolled.state.battle!.encounter!.turn.type).toBe("hero");
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    const done = applyCommand(waiting.state, choose(waiting.state, "e"));
    expect(target(done.state).dead).toBe(true);
    expect(done.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(done.events.filter((event) => event.type === "shuffleResolved")).toHaveLength(1);
  });

  it("位移完成后仅补一次死亡空位，其他怪物的棋子区域不动", () => {
    const initial = setup(pointBlank, true, 1);
    const other = { ...target(initial), id: "other", life: 100, stance: "defensive" as const };
    const prepared = {
      ...initial,
      battle: { ...initial.battle!, entities: [...initial.battle!.entities, other] },
    };
    const rolled = applyCommand(heroTurn(prepared), play(pointBlank));
    expect(rolled.state.battle!.entities.find((entity) => entity.id === "other")!.stance).toBe(
      "defensive",
    );
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    const done = applyCommand(waiting.state, choose(waiting.state, "e"));
    expect(done.state.battle!.entities.find((entity) => entity.id === "other")).toMatchObject({
      stance: "aggressive",
      areaId: "a",
    });
    expect(done.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
    expect(applyCommand(done.state, { type: "resolveShuffles" }).state).toBe(done.state);
  });

  it("缺少容量时拒绝位移且冻结后续技能，保留意图与 RNG；无意图时拒绝", () => {
    const initial = setup();
    const changed = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: initial.battle!.areas.map(({ id, adjacent, elevation }) => ({
          id,
          adjacent,
          elevation,
        })),
      },
    };
    const rolled = applyCommand(changed, play());
    const refused = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(refused.events[0]).toMatchObject({ type: "commandRefused" });
    expect(refused.state).toBe(rolled.state);
    expect(applyCommand(rolled.state, play()).state).toBe(rolled.state);
    expect(applyCommand(initial, { type: "resolveShuffles" }).state).toBe(initial);
  });
});
