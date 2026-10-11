import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, createRng, rollD10 } from "./index";
import type { BattleEntity, Command, GameState, HeroSkillCardView, SkillStance } from "./index";

const cards = (
  JSON.parse(
    readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
  ) as { cards: HeroSkillCardView[] }
).cards;
const skill = cards.find((card) => card.id === "hero_skill:p001")!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
function setup(seed = 0, monsters: Partial<BattleEntity>[] = [{}]): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: "a",
    stance,
    hero: "CRUSADER",
    skillIds: [skill.id],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const enemies: BattleEntity[] = monsters.map((overrides, index) => ({
    id: `m${index}`,
    side: "monster",
    areaId: "a",
    stance: stances[index]!,
    stanceSlots: 1,
    hero: null,
    skillIds: [],
    wounds: 0,
    life: 100,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...overrides,
  }));
  return createBattleState(seed, {
    entities: [...heroes, ...enemies.map((e) => ({ ...e, monsterCardId: e.id }))],
    monsters: enemies.map((e) => ({
      id: e.id,
      life: e.life!,
      verification: { unverified: false },
      type_position_tags: ["Beast"],
      skills: [],
    })),
    areas: [{ id: "a", elevation: "normal", adjacent: [] }],
    light: 5,
    skills: [skill],
  });
}
function start(state = setup()): GameState {
  const result = applyCommand(state, { type: "startBattle" });
  expect(result.events[0]?.type).toBe("roundStarted");
  return result.state;
}
function nextHero(state: GameState): GameState {
  let next = state;
  for (let index = 0; index < 8; index += 1) {
    const result = applyCommand(next, { type: "drawInitiative" });
    next = result.state;
    const turn = next.battle!.encounter!.turn;
    if (turn.type === "hero") return next;
    if (turn.type !== "monster") throw new Error("没有英雄回合");
    next = applyCommand(next, { type: "finishMonsterTurn", actorId: turn.actorId }).state;
  }
  throw new Error("先攻牌堆未返回英雄");
}
function play(actorId = "h0"): Command {
  return { type: "playHeroSkill", actorId, targetId: "m0", skillId: skill.id };
}
function swap(state: GameState): Command {
  const turn = state.battle!.encounter!.turn;
  if (turn.type !== "hero") throw new Error("不是英雄回合");
  const stance = state.battle!.entities.find((entity) => entity.id === turn.actorId)!.stance;
  return {
    type: "changeStance",
    actorId: turn.actorId,
    direction: stance === "aggressive" ? "backward" : "forward",
  };
}

describe("普通遭遇战先攻与回合（R17–19、R25、R-025、R-030、R-032）", () => {
  it("种子洗牌确定、每名英雄和每只怪物各一张，大型怪仍一张；不改初始状态", () => {
    const state = setup(1, [{ stanceSlots: 2 }, { stance: "ranged", stanceSlots: 2 }]);
    const copy = structuredClone(state);
    const first = applyCommand(state, { type: "startBattle" });
    expect(first).toEqual(applyCommand(state, { type: "startBattle" }));
    expect(first.state.battle!.encounter!.deck.filter((side) => side === "hero")).toHaveLength(4);
    expect(first.state.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(
      2,
    );
    expect(first.state.battle!.rngCursor).toBe(5);
    expect(state).toEqual(copy);
    expect(applyCommand(first.state, { type: "startBattle" }).state).toBe(first.state);
  });

  it("换姿态只换轨道、扣行动；下张英雄卡按当时的姿态挑未行动者", () => {
    const state = nextHero(start());
    const first = applyCommand(state, swap(state));
    expect(first.state.battle!.encounter!.turn).toMatchObject({ actorId: "h0", actions: 1 });
    expect(first.state.battle!.entities.slice(0, 2).map((entity) => entity.stance)).toEqual([
      "defensive",
      "aggressive",
    ]);
    expect(first.state.battle!.entities.every((entity) => entity.areaId === "a")).toBe(true);
    const second = applyCommand(first.state, {
      type: "changeStance",
      actorId: "h0",
      direction: "backward",
    });
    expect(second.state.battle!.encounter!.actedIds).toContain("h0");
    const rearranged: GameState = {
      ...second.state,
      battle: {
        ...second.state.battle!,
        entities: second.state.battle!.entities.map((entity) =>
          entity.id === "h1"
            ? { ...entity, stance: "support" }
            : entity.id === "h3"
              ? { ...entity, stance: "aggressive" }
              : entity,
        ),
      },
    };
    expect(nextHero(rearranged).battle!.encounter!.turn).toMatchObject({ actorId: "h3" });
  });

  it("技能与洗牌共用 RNG；命中后同回合不能重用，拒绝不消耗行动 / RNG", () => {
    const state = nextHero(start());
    const rng = createRng(state.seed);
    for (let index = 0; index < state.battle!.rngCursor; index += 1) rng.next();
    const result = applyCommand(state, play());
    expect(result.events[0]).toMatchObject({
      type: "heroSkillResolved",
      roll: rollD10(rng),
      resolution: { outcome: "hit" },
    });
    expect(result.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [skill.id],
    });
    expect(applyCommand(result.state, play()).state).toBe(result.state);
    expect(applyCommand(result.state, { type: "drawInitiative" }).state).toBe(result.state);
    expect(applyCommand(result.state, play("h1")).state).toBe(result.state);
    expect(applyCommand(result.state, { type: "finishMonsterTurn", actorId: "m0" }).state).toBe(
      result.state,
    );
  });

  it("全落空允许再次用同一技能，但两次都扣行动，之后只能抽先攻", () => {
    const state = nextHero(start(setup(0, [{ dodge: 20 }])));
    const first = applyCommand(state, play());
    expect(first.state.battle!.encounter!.turn).toMatchObject({ actions: 1, usedSkillIds: [] });
    const second = applyCommand(first.state, play());
    expect(second.events.map((event) => event.type)).toEqual(["heroSkillResolved", "turnEnded"]);
    expect(second.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(applyCommand(second.state, play()).state).toBe(second.state);
  });

  it("无 Acc 自身技能也扣行动、锁定重用，但不消费 RNG", () => {
    const transform = cards.find((card) => card.id === "hero_skill:p220")!;
    const initial = setup();
    const state = nextHero(
      start({
        ...initial,
        battle: {
          ...initial.battle!,
          skills: [transform],
          entities: initial.battle!.entities.map((entity) =>
            entity.id === "h0"
              ? { ...entity, hero: "ABOMINATION", skillIds: [transform.id], form: "human" }
              : { ...entity, skillIds: [] },
          ),
        },
      }),
    );
    const command: Command = {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "h0",
      skillId: transform.id,
    };
    const result = applyCommand(state, command);
    expect(result.events[0]).toMatchObject({ roll: null });
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(result.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [transform.id],
    });
    expect(applyCommand(result.state, command).state).toBe(result.state);
  });

  it("怪物死后只补姿态位；对应阵营无可行动者时弃牌继续抽，不消费 RNG", () => {
    const state = nextHero(start(setup(0, [{ life: 1 }, {}])));
    const killed = applyCommand(state, play());
    expect(killed.state.battle!.entities.find((entity) => entity.id === "m1")).toMatchObject({
      stance: "aggressive",
      areaId: "a",
    });
    const fixture: GameState = {
      ...killed.state,
      battle: {
        ...killed.state.battle!,
        encounter: {
          ...killed.state.battle!.encounter!,
          deck: ["monster", "hero"],
          actedIds: ["h0", "m1"],
          turn: { type: "awaitingInitiative" },
        },
      },
    };
    const drawn = applyCommand(fixture, { type: "drawInitiative" });
    expect(drawn.events.map((event) => event.type)).toEqual(["initiativeDiscarded", "turnStarted"]);
    expect(drawn.state.battle!.encounter!.turn).toMatchObject({ actorId: "h1" });
    expect(drawn.state.battle!.rngCursor).toBe(fixture.battle!.rngCursor);
  });

  it("最后一只怪物死后立即胜利，不等英雄用完行动；未生成怪物也直接胜利", () => {
    const state = nextHero(start(setup(0, [{ life: 1 }])));
    const done = applyCommand(state, play());
    expect(done.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(done.events.at(-1)).toMatchObject({ type: "battleFinished", outcome: "victory" });
    expect(applyCommand(done.state, { type: "drawInitiative" }).state).toBe(done.state);
    expect(
      applyCommand(setup(0, []), { type: "startBattle" }).state.battle!.encounter!.turn,
    ).toEqual({ type: "finished", outcome: "victory" });
    const empty = setup(0, []);
    const withBleed: GameState = {
      ...empty,
      battle: {
        ...empty.battle!,
        entities: empty.battle!.entities.map((entity) => ({
          ...entity,
          bleed: ["duration-unknown"],
        })),
      },
    };
    expect(applyCommand(withBleed, { type: "startBattle" }).state.battle!.encounter!.turn).toEqual({
      type: "finished",
      outcome: "victory",
    });
  });

  it("完整命令日志可回放；每人每轮一次，第 4 轮结束撤退，不生成第 5 轮", () => {
    const initial = setup();
    const commands: Command[] = [{ type: "startBattle" }];
    let state = applyCommand(initial, commands[0]!).state;
    const actors = new Map<number, string[]>();
    for (let index = 0; index < 100; index += 1) {
      const encounter = state.battle!.encounter!;
      if (encounter.turn.type === "finished") break;
      const command: Command =
        encounter.turn.type === "awaitingInitiative"
          ? { type: "drawInitiative" }
          : encounter.turn.type === "monster"
            ? { type: "finishMonsterTurn", actorId: encounter.turn.actorId }
            : swap(state);
      const result = applyCommand(state, command);
      for (const event of result.events) {
        if (event.type === "turnStarted")
          actors.set(event.round, [...(actors.get(event.round) ?? []), event.actorId!]);
      }
      commands.push(command);
      expect(result.state).not.toBe(state);
      state = result.state;
    }
    expect(state.battle!.encounter!.round).toBe(4);
    expect(state.battle!.encounter!.actedIds).toHaveLength(5);
    expect(state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
    for (const list of actors.values())
      expect([...list].sort()).toEqual(["h0", "h1", "h2", "h3", "m0"]);
    expect(actors.size).toBe(4);
    expect(commands.reduce((next, command) => applyCommand(next, command).state, setup())).toEqual(
      state,
    );
  });

  it("拒绝未核实占格数、重叠姿态与未接入的回合开始状态；不推进 RNG", () => {
    const initial = setup();
    for (const mutate of [
      (entity: BattleEntity) =>
        entity.id === "m0" ? { ...entity, stanceSlots: undefined } : entity,
      (entity: BattleEntity) =>
        entity.id === "h1" ? { ...entity, stance: "aggressive" as const } : entity,
      (entity: BattleEntity) =>
        entity.id === "h0" ? { ...entity, bleed: ["duration-unknown"] } : entity,
    ]) {
      const state = {
        ...initial,
        battle: { ...initial.battle!, entities: initial.battle!.entities.map(mutate) },
      } as GameState;
      expect(applyCommand(state, { type: "startBattle" }).state).toBe(state);
    }
  });

  it("大型怪阵亡空出两格，后排只补轨道，不改变区域", () => {
    const state = nextHero(
      start(setup(0, [{ life: 1, stanceSlots: 2 }, { stance: "ranged" }, { stance: "support" }])),
    );
    const result = applyCommand(state, play());
    expect(result.state.battle!.entities.find((entity) => entity.id === "m1")).toMatchObject({
      stance: "aggressive",
      areaId: "a",
    });
    expect(result.state.battle!.entities.find((entity) => entity.id === "m2")).toMatchObject({
      stance: "defensive",
      areaId: "a",
    });
  });

  it("方向和区域位移完成后扣一次行动；位移尚未应用时阻止后续回合操作", () => {
    const blast = cards.find((card) => card.id === "hero_skill:p145")!;
    const initial = setup();
    const changed: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        skills: [blast],
        areas: [
          { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
          { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
        ],
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "h0"
            ? { ...entity, stance: "defensive", hero: "PLAGUE DOCTOR", skillIds: [blast.id] }
            : entity.id === "h1"
              ? { ...entity, stance: "aggressive", skillIds: [] }
              : entity.id === "m0"
                ? { ...entity, areaId: "b" }
                : { ...entity, skillIds: [] },
        ),
      },
    };
    let state = nextHero(start(changed));
    expect(state.battle!.encounter!.turn).toMatchObject({ actorId: "h1" });
    state = applyCommand(state, swap(state)).state;
    state = applyCommand(state, swap(state)).state;
    state = nextHero(state);
    const waiting = applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m0",
      skillId: blast.id,
    });
    expect(waiting.state.battle!.encounter!.turn).toMatchObject({ actions: 2 });
    expect(waiting.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(applyCommand(waiting.state, swap(waiting.state)).state).toBe(waiting.state);
    const done = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "pull",
    });
    expect(done.state.battle!.encounter!.turn).toMatchObject({ actions: 2 });
    expect(done.state.battle!.shuffleIntents).toHaveLength(1);
    expect(applyCommand(done.state, swap(done.state)).state).toBe(done.state);
    const moved = applyCommand(done.state, { type: "resolveShuffles" });
    expect(moved.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    expect(moved.state.battle!.shuffleIntents).toEqual([]);
    expect(moved.state.battle!.entities.find((entity) => entity.id === "m0")!.areaId).toBe("a");
    expect(applyCommand(moved.state, { type: "resolveShuffles" }).state).toBe(moved.state);
  });
});
