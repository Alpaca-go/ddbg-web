import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import rawCurios from "../../data/normalized/corebox/curio.json";
import rawStats from "../../data/normalized/corebox/hero_stat.json";
import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import { curioFileSchema } from "../../data/src/curio";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonBattleCatalog } from "./dungeon";
import { createConditionPool } from "./conditions";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createLootState } from "./loot";
import { resolveSeededHeroHealth } from "./hero-health";

const cards = curioFileSchema.parse(rawCurios).cards;
const stats = normalizedHeroStatFileSchema.parse(rawStats)
  .cards as DungeonBattleCatalog["heroStats"];
const diseaseCards = diseaseFileSchema.parse(diseases).cards;
const quirkCards = normalizedQuirkFileSchema.parse(quirks).cards;
const quirk = (name: string) => quirkCards.find((q) => q.name === name)!.id;
function setup(seed: number): GameState {
  const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
    const stat = stats.find((s) => s.name === name && s.level === 1)!;
    return {
      id: `h${i}`,
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      stress: 0,
      level: 1,
      life: stat.life,
      wounds: 0,
      heroStatId: stat.id,
      attributesVerified: true,
    };
  });
  const state = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "G",
    heroes,
    [],
    { dungeonLevel: 1, light: 5, provisions: [{ id: "torch", face: "torch" }] },
    cards,
    undefined,
    undefined,
    { heroStats: stats, skills: [], monsters: [] },
  );
  return {
    ...state,
    dungeon: {
      ...state.dungeon!,
      conditions: createConditionPool(diseaseCards, quirkCards),
      lootPool: createLootState(),
    },
  };
}
function choose(state: GameState, optionId: string) {
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  });
}
function route(seed: number) {
  const state = setup(seed);
  return choose(applyCommand(state, { type: "beginDungeonExploration" }).state, "D").state;
}
function drawn(protectedCard = false) {
  const rolled = applyCommand(route(46), { type: "rollDungeonExploration" }).state;
  const hazard = choose(rolled, "h0:1").state;
  return choose(hazard, protectedCard ? "use:torch" : "draw").state;
}
const resolve = (state: GameState) => applyCommand(state, { type: "resolveDungeonCurio" });
it("seed46真实完整牌池抽p4：不使用Torch，四行一次提交、续接与完整回放", () => {
  const initial = setup(46),
    before = structuredClone(initial);
  let state: GameState = initial;
  const log: Command[] = [];
  const dispatch = (command: Command) => {
    log.push(command);
    state = applyCommand(state, command).state;
  };
  const pick = (optionId: string) =>
    dispatch({ type: "resolveChoice", choiceId: state.dungeon!.pending!.id, optionId });
  dispatch({ type: "beginDungeonExploration" });
  pick("D");
  dispatch({ type: "rollDungeonExploration" });
  pick("h0:1");
  pick("draw");
  expect(state.dungeon!.curio!.active).toMatchObject({ cardId: "curio:p004", protected: false });
  const cursor = state.dungeon!.cursor;
  const provisions = state.dungeon!.explorationSetup!.provisions;
  dispatch({ type: "resolveDungeonCurio" });
  expect(state.dungeon!.heroes[0]).toMatchObject({
    stress: 1,
    wounds: 0,
    statusStacks: [
      { kind: "blight", remaining: 3, amount: 1 },
      { kind: "debuff", remaining: 2 },
    ],
  });
  expect(state.dungeon!.heroes.slice(1)).toEqual(initial.dungeon!.heroes.slice(1));
  expect(state.dungeon!.gold).toBe(5);
  expect(state.dungeon!.lootPool!.gold).toBe(5);
  expect(state.dungeon!.curio!.discard).toEqual(["curio:p004"]);
  expect(state.dungeon!.curio!.active).toBeNull();
  expect(state.dungeon!.exploration!.rolls![0]!.resolved).toBe(true);
  expect(state.dungeon!.phase).toBe("awaitingHazards");
  expect(state.dungeon!.cursor).toBe(cursor);
  expect(state.dungeon!.explorationSetup!.provisions).toEqual(provisions);
  expect(resolve(state).state).toBe(state);
  expect(log.reduce((s, c) => applyCommand(s, c).state, initial)).toEqual(state);
  expect(initial).toEqual(before);
});
it("Torch仍只抑制三行负面，金币正常奖励，消耗一次Torch", () => {
  const initial = drawn(true),
    result = resolve(initial).state;
  expect(result.dungeon!.heroes).toEqual(initial.dungeon!.heroes);
  expect(result.dungeon!.gold).toBe(5);
  expect(result.dungeon!.lootPool!.gold).toBe(5);
  expect(result.dungeon!.explorationSetup!.provisions).toEqual([]);
});
it("保留已有状态；Thick Blooded与Thin Blooded按已有被动原语处理", () => {
  for (const name of ["Thick Blooded", "Thin Blooded"]) {
    const initial = drawn(),
      d = initial.dungeon!;
    const changed = {
      ...initial,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i
            ? h
            : {
                ...h,
                quirkIds: [quirk(name)],
                statusStacks: [{ kind: "guard" as const, remaining: 2 }],
              },
        ),
      },
    };
    const result = resolve(changed).state;
    const stacks = result.dungeon!.heroes[0]!.statusStacks!;
    expect(stacks[0]).toEqual({ kind: "guard", remaining: 2 });
    expect(stacks.filter((s) => s.kind === "blight")).toEqual(
      name === "Thick Blooded"
        ? [{ kind: "blight", remaining: 2, amount: 1 }]
        : [
            { kind: "blight", remaining: 3, amount: 1 },
            { kind: "blight", remaining: 3, amount: 1 },
          ],
    );
    expect(stacks.at(-1)).toEqual({ kind: "debuff", remaining: 2 });
    expect(result.dungeon!.heroes[0]!.wounds).toBe(0);
  }
});
it("Q-62压力10与缺防御保持整卡停点；补齐防御后原牌续接", () => {
  const initial = drawn(),
    d = initial.dungeon!;
  for (const changed of [
    {
      ...initial,
      dungeon: { ...d, heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 9 })) },
    },
    { ...initial, dungeon: { ...d, battleCatalog: { heroStats: [], skills: [], monsters: [] } } },
  ]) {
    const result = resolve(changed).state;
    expect(result.dungeon!.curio!.active?.cardId).toBe("curio:p004");
    expect(result.dungeon!.heroes).toEqual(changed.dungeon!.heroes);
    expect(result.dungeon!.gold).toBe(0);
    expect(result.dungeon!.lootPool!.gold).toBe(0);
    expect(result.dungeon!.cursor).toBe(d.cursor);
    expect(result.dungeon!.curio!.discard).toEqual([]);
  }
  const missing = {
    ...initial,
    dungeon: { ...d, battleCatalog: { heroStats: [], skills: [], monsters: [] } },
  };
  const blocked = resolve(missing).state;
  expect(
    resolve({ ...blocked, dungeon: { ...blocked.dungeon!, battleCatalog: d.battleCatalog! } }).state
      .dungeon!.gold,
  ).toBe(5);
});
it("Black Plague追加伤口未接时整次拒绝，不先支付压力/状态/金币", () => {
  const initial = drawn(),
    d = initial.dungeon!;
  const changed = {
    ...initial,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              diseaseId: diseaseCards.find((c) => c.name === "Black Plague")!.id,
            },
      ),
    },
  };
  const before = structuredClone(changed);
  const result = resolve(changed);
  expect(result.state).toBe(changed);
  expect(result.events[0]!.type).toBe("commandRefused");
  expect(changed).toEqual(before);
});
it("压力被动导致死亡的后续奖惩仍原子拒绝，不提交死门骰或奖励", () => {
  const initial = drawn(),
    d = initial.dungeon!,
    life = d.heroes[0]!.life!;
  const seed = Array.from({ length: 100 }, (_, i) => i).find((seed) => {
    const r = resolveSeededHeroHealth(
      { life, wounds: life, dead: false },
      { type: "wounds", amounts: [1] },
      seed,
      d.cursor,
    );
    return r.status === "resolved" && r.state.dead;
  })!;
  const changed = {
    ...initial,
    seed,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              wounds: life,
              quirkIds: [quirk("Soft")],
            },
      ),
    },
  };
  expect(resolve(changed).state).toBe(changed);
});
it("共享金币与战利品金币漂移时不提交Curio奖励", () => {
  const initial = drawn(),
    bad = { ...initial, dungeon: { ...initial.dungeon!, gold: 2 } };
  const result = resolve(bad).state;
  expect(result.dungeon!.heroes).toEqual(bad.dungeon!.heroes);
  expect(result.dungeon!.gold).toBe(2);
  expect(result.dungeon!.lootPool!.gold).toBe(0);
  expect(result.dungeon!.curio!.active?.cardId).toBe("curio:p004");
});
