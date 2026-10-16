import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import catalog from "../../data/normalized/corebox/virtue_affliction.json";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { createConditionPool } from "./conditions";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState } from "./dungeon";
import type { ResolveCard } from "./pressure";
import { createRng } from "./rng";

const heroes = [
  { id: "h0", stress: 0, life: 10, wounds: 0, attributesVerified: true },
  { id: "h1", stress: 0, life: 10, wounds: 0, attributesVerified: true },
];
function setup(level = 3, party: DungeonState["heroes"] = heroes, seed = 1): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "radiant",
    "D",
    party,
    catalog.cards as ResolveCard[],
    { dungeonLevel: level, light: 5, provisions: [{ id: "tool", face: "tool" }] },
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "trap" } : r)),
    },
  };
}
const patch = (s: GameState, fields: Partial<DungeonState>): GameState => ({
  ...s,
  dungeon: { ...s.dungeon!, ...fields },
});
const start = (s: GameState) => applyCommand(s, { type: "resolveDungeonRoom" }).state;
const pick = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
const allocate = (s: GameState, heroId: string, wounds: number) =>
  pick(pick(s, heroId).state, String(wounds));

describe("Trap 房间（R15、R28–29、R-026、R-045）", () => {
  it.each([1, 2, 3])("DL%d 每个合法分配总计 DL，伤口不作攻击修正、不消耗 Tool", (level) => {
    for (let wounds = 0; wounds <= level; wounds++) {
      const s = setup(level, [heroes[0]!]);
      const before = structuredClone(s);
      const selected = pick(start(s), "h0").state;
      expect(selected.dungeon!.pending!.actorId).toBe("h0");
      expect(selected.dungeon!.pending!.options).toHaveLength(level + 1);
      expect(pick(selected, "use:tool").state).toBe(selected);
      const result = pick(selected, String(wounds)).state;
      expect(result.dungeon!.heroes[0]).toMatchObject({ wounds, stress: level - wounds });
      expect(result.dungeon).toMatchObject({ cursor: 7, phase: "ready", gold: 0 });
      expect(result.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
      expect(result.dungeon!.explorationSetup!.provisions).toEqual(
        s.dungeon!.explorationSetup!.provisions,
      );
      expect(s).toEqual(before);
    }
  });
  it("每英雄只结算一次，选英雄不扣数值；最后一名完成前导航冻结，陈旧选择 / 重启拒绝", () => {
    const initial = setup();
    const started = start(initial);
    const selected = pick(started, "h1").state;
    expect(selected.dungeon!.heroes).toEqual(initial.dungeon!.heroes);
    const first = pick(selected, "1").state;
    expect(first.dungeon!.roomResolution!.resolvedHeroIds).toEqual(["h1"]);
    expect(first.dungeon!.pending!.options.map((o) => o.id)).toEqual(["h0"]);
    expect(pick(first, "h1").state).toBe(first);
    for (const type of [
      "resolveDungeonRoom",
      "scoutDungeon",
      "beginDungeonExploration",
      "beginDungeonBacktrack",
      "rollDungeonExploration",
    ] as const)
      expect(applyCommand(first, { type }).state).toBe(first);
    const stale: Command = {
      type: "resolveChoice",
      choiceId: selected.dungeon!.pending!.id,
      optionId: "1",
    };
    expect(applyCommand(first, stale).state).toBe(first);
    const done = allocate(first, "h0", 3).state;
    expect(done.dungeon).toMatchObject({
      phase: "ready",
      pending: null,
      roomResolution: { completed: true },
    });
    expect(applyCommand(done, { type: "resolveDungeonRoom" }).state).toBe(done);
  });
  it("纯压力到 10 立即意志检定，续接剩余英雄、不侦察 / 揭示邻居 / 重付", () => {
    const s = setup(3, [{ ...heroes[0]!, stress: 9 }, heroes[1]!]);
    const result = allocate(start(s), "h0", 0);
    expect(result.state.dungeon!.heroes[0]).toMatchObject({ stress: 0, resolveTested: true });
    expect(result.state.dungeon!.roomResolution!.resolvedHeroIds).toEqual(["h0"]);
    expect(result.state.dungeon).toMatchObject({
      phase: "awaitingRoom",
      scoutBonus: false,
      position: "D",
    });
    expect(result.state.dungeon!.rooms).toEqual(s.dungeon!.rooms);
    expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(1);
    expect(allocate(result.state, "h1", 3).state.dungeon!.phase).toBe("ready");
  });
  it("缺意志资料保存已付分配；补齐后等于完整路径，不重复伤口 / RNG / 压力", () => {
    const initial = setup(3, [{ ...heroes[0]!, stress: 9 }, heroes[1]!]);
    const blocked = allocate(start(patch(initial, { resolveCards: [] })), "h0", 1).state;
    expect(blocked.dungeon).toMatchObject({ phase: "blockedPressure", position: "D", cursor: 7 });
    expect(blocked.dungeon!.heroes[0]!.stress).toBe(10);
    expect(blocked.dungeon!.heroes[0]!.wounds).toBe(0);
    expect(blocked.dungeon!.roomResolution).toMatchObject({
      resolvedHeroIds: [],
      pendingAllocation: { heroId: "h0", wounds: 1 },
    });
    expect(applyCommand(blocked, { type: "resolveDungeonPressure" }).state).toBe(blocked);
    const repaired = patch(blocked, { resolveCards: catalog.cards as ResolveCard[] });
    const recovered = applyCommand(repaired, { type: "resolveDungeonPressure" }).state;
    expect(recovered).toEqual(allocate(start(initial), "h0", 1).state);
    expect(recovered.dungeon!.heroes[0]!.wounds).toBe(1);
    expect(recovered.dungeon!.pending!.options.map((o) => o.id)).toEqual(["h1"]);
    expect(applyCommand(recovered, { type: "resolveDungeonPressure" }).state).toBe(recovered);
  });
  it("纯伤口首次到死门不掷骰；再次受伤只掷一次，空白继续 / 骷髅停在替换接口", () => {
    const entered = allocate(start(setup(3, [{ ...heroes[0]!, wounds: 8 }])), "h0", 3).state;
    expect(entered.dungeon).toMatchObject({ cursor: 7, phase: "ready" });
    expect(entered.dungeon!.heroes[0]!.wounds).toBe(10);
    const outcomes = new Set<boolean>();
    for (let seed = 1; seed <= 15; seed++) {
      const s = setup(3, [{ ...heroes[0]!, wounds: 10 }], seed);
      const result = allocate(start(s), "h0", 3).state;
      const rng = createRng(seed);
      for (let i = 0; i < 7; i++) rng.next();
      const dead = rng.next() < 0.3;
      outcomes.add(dead);
      expect(result.dungeon!.cursor).toBe(8);
      expect(result.dungeon!.heroes[0]).toMatchObject({ wounds: 10, dead });
      expect(result.dungeon!.phase).toBe(dead ? "awaitingReplacement" : "ready");
      expect(result.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
    }
    expect(outcomes.size).toBe(2);
  });
  it("心脏病停在已进入的房间，不给剩余英雄结算 / 战役结果", () => {
    const s = setup(1, [
      { ...heroes[0]!, stress: 9, resolveTested: true, resolveCardId: catalog.cards[0]!.id },
      heroes[1]!,
    ]);
    const result = allocate(start(s), "h0", 0);
    expect(result.state.dungeon).toMatchObject({
      position: "D",
      phase: "awaitingReplacement",
      cursor: 7 + 4, // R-091：仅意志洗回，不掷心脏病骰。
    });
    expect(result.state.dungeon!.heroes[1]).toEqual(heroes[1]);
    expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
  });
  it("R-069/Q-64混合分配先意志、后分配伤口；心脏病取消未付伤口", () => {
    const initial = setup(3, [{ ...heroes[0]!, stress: 9, wounds: 9 }]);
    const snapshot = structuredClone(initial);
    const result = allocate(start(initial), "h0", 1);
    expect(result.state.dungeon!.heroes[0]).toMatchObject({
      stress: 0,
      wounds: 10,
      resolveTested: true,
    });
    expect(result.state.dungeon!.cursor).toBe(12);
    expect(result.events.findIndex((e) => e.type === "resolveTested")).toBeLessThan(
      result.events.findIndex((e) => e.type === "heroHealthResolved"),
    );
    expect(result).toEqual(allocate(start(initial), "h0", 1));
    expect(initial).toEqual(snapshot);
    const cardiac = setup(3, [
      { ...heroes[0]!, stress: 9, resolveTested: true, resolveCardId: catalog.cards[0]!.id },
      heroes[1]!,
    ]);
    const dead = allocate(start(cardiac), "h0", 1);
    expect(dead.state.dungeon!.heroes[0]).toMatchObject({ stress: 10, wounds: 0, dead: true });
    expect(dead.state.dungeon).toMatchObject({
      phase: "awaitingReplacement",
      cursor: 7 + 4, // R-091意志洗回。
      roomResolution: { resolvedHeroIds: ["h0"] },
    });
    expect(dead.state.dungeon!.roomResolution!.pendingAllocation).toBeUndefined();
    expect(dead.events.some((e) => e.type === "heroHealthResolved")).toBe(false);
    expect(dead.state.dungeon!.heroes[1]).toEqual(heroes[1]);
  });
  it("Soft压力伤口与分配伤口是顺序两批：死门死亡取消第二批，存活才继续", () => {
    for (const faces of [
      [true, false],
      [false, true],
      [false, false],
    ]) {
      const seed = Array.from({ length: 500 }, (_, i) => i).find((value) => {
        const rng = createRng(value);
        for (let i = 0; i < 7; i++) rng.next();
        return rng.next() < 0.3 === faces[0] && rng.next() < 0.3 === faces[1];
      })!;
      const initial = setup(
        3,
        [{ ...heroes[0]!, level: 1, wounds: 10, quirkIds: ["quirk:p035"] }],
        seed,
      );
      const held = patch(initial, {
        conditions: createConditionPool(
          diseaseFileSchema.parse(diseaseData).cards,
          normalizedQuirkFileSchema.parse(quirkData).cards,
        ),
      });
      const result = allocate(start(held), "h0", 1);
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
      expect(result.state.dungeon!.heroes[0]).toMatchObject({
        stress: 2,
        wounds: 10,
        dead: faces[0] || faces[1],
      });
      expect(result.state.dungeon!.cursor).toBe(
        (faces[0] ? 8 : 9) + (faces[0] || faces[1] ? 17 : 0), // R-091：仅死亡时洗回负面怪癖。
      );
      expect(result.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(
        faces[0] ? 1 : 2,
      );
      expect(result.state.dungeon!.roomResolution!.pendingAllocation).toBeUndefined();
      expect(result).toEqual(allocate(start(held), "h0", 1));
    }
  });
  it("缺 Life / 未核实属性 / 非法 DL / 非Trap 房间开始时拒绝，数据修复后可继续", () => {
    const s = setup();
    const bad = [
      patch(s, { heroes: [{ id: "h", stress: 0 }] }),
      patch(s, { heroes: [{ ...heroes[0]!, attributesVerified: false }] }),
      patch(s, { explorationSetup: { ...s.dungeon!.explorationSetup!, dungeonLevel: 4 } }),
      patch(s, { rooms: s.dungeon!.rooms.map((r) => ({ ...r, kind: "objective" as const })) }),
    ];
    for (const invalid of bad) expect(start(invalid)).toBe(invalid);
  });
  it("真实种子1 Radiant零骰进入Trap，普通走廊返回后再次进房重付；日志回放一致", () => {
    const initial = createDungeonSandbox(
      1,
      layout,
      distribution,
      "radiant",
      "G",
      heroes,
      catalog.cards as ResolveCard[],
      { dungeonLevel: 1, light: 5, provisions: [{ id: "tool", face: "tool" }] },
    );
    const before = structuredClone(initial);
    let s = initial;
    const log: Command[] = [];
    const dispatch = (c: Command) => {
      log.push(c);
      s = applyCommand(s, c).state;
    };
    const choose = (id: string) =>
      dispatch({ type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId: id });
    dispatch({ type: "scoutDungeon" });
    choose("agree");
    dispatch({ type: "beginDungeonExploration" });
    choose("D");
    dispatch({ type: "rollDungeonExploration" });
    expect(s.dungeon).toMatchObject({ position: "D", phase: "awaitingRoom", cursor: 7 });
    const resolve = () => {
      dispatch({ type: "resolveDungeonRoom" });
      for (const h of heroes) {
        choose(h.id);
        choose("1");
      }
    };
    resolve();
    dispatch({ type: "beginDungeonBacktrack" });
    choose("G");
    dispatch({ type: "beginDungeonBacktrack" });
    choose("D");
    expect(s.dungeon!.phase).toBe("awaitingRoom");
    resolve();
    expect(s.dungeon).toMatchObject({ phase: "ready", cursor: 7 });
    expect(s.dungeon!.heroes.map((h) => [h.wounds, h.stress])).toEqual([
      [2, 3],
      [2, 3],
    ]);
    expect(s.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
    expect(log.reduce((state, c) => applyCommand(state, c).state, initial)).toEqual(s);
    expect(initial).toEqual(before);
  });
});
