import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import catalog from "../../data/normalized/corebox/virtue_affliction.json";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState } from "./dungeon";
import type { ResolveCard } from "./pressure";

function setup(
  stress = 0,
  cards: readonly ResolveCard[] = catalog.cards as ResolveCard[],
): GameState {
  const s = createDungeonSandbox(
    31,
    layout,
    distribution,
    "standard",
    "D",
    [{ id: "hero-0", stress }],
    cards,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      visited: ["G", "D"],
      traversedCorridors: [["G", "D"]],
      rooms: s.dungeon!.rooms.map((r) =>
        ["G", "D"].includes(r.id) ? { ...r, cleared: true, revealed: true } : r,
      ),
    },
  };
}
const pick = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
const begin = (s: GameState) => applyCommand(s, { type: "beginDungeonBacktrack" }).state;
const back = (s: GameState) => pick(begin(s), "G");
function patch(s: GameState, fields: Partial<DungeonState>): GameState {
  return { ...s, dungeon: { ...s.dungeon!, ...fields } };
}

describe("普通走廊原路返回（R14–15、R28）", () => {
  it("仅走过的相邻走廊可返回；选择 / 取消 / 陈旧命令不扣压力或 RNG", () => {
    const s = setup();
    const started = begin(s);
    expect(started.dungeon!.pending!.options.map((o) => o.id)).toEqual(["G", "cancel"]);
    expect(started.dungeon!.heroes).toEqual(s.dungeon!.heroes);
    expect(pick(started, "A").state).toBe(started);
    const cancelled = pick(started, "cancel").state;
    expect(cancelled.dungeon!.heroes).toEqual(s.dungeon!.heroes);
    expect(cancelled.dungeon!.cursor).toBe(s.dungeon!.cursor);
    expect(
      applyCommand(begin(cancelled), {
        type: "resolveChoice",
        choiceId: started.dungeon!.pending!.id,
        optionId: "G",
      }).events[0]!.type,
    ).toBe("commandRefused");
    for (const fields of [{ traversedCorridors: [] }, { visited: ["D"] }, { position: "S" }]) {
      const invalid = patch(s, fields);
      expect(applyCommand(invalid, { type: "beginDungeonBacktrack" }).state).toBe(invalid);
    }
    // 已揭示 / 访问相邻房间不证明真的走过这条边。
    const seen = patch(s, {
      visited: ["G", "D", "A"],
      rooms: s.dungeon!.rooms.map((r) => ({ ...r, revealed: true })),
    });
    expect(begin(seen).dungeon!.pending!.options.map((o) => o.id)).not.toContain("A");
  });
  it("往返一次一压力，无骰 / 补给 / 奖励 / 重新清理；侦察奖励保留，输入不变、日志回放一致", () => {
    const initial = patch(setup(), { scoutBonus: true, gold: 10 });
    const before = structuredClone(initial);
    const log: Command[] = [
      { type: "beginDungeonBacktrack" },
      { type: "resolveChoice", choiceId: "dungeon-backtrack:0", optionId: "G" },
      { type: "beginDungeonBacktrack" },
      { type: "resolveChoice", choiceId: "dungeon-backtrack:1", optionId: "D" },
    ];
    const result = log.reduce((s, c) => applyCommand(s, c).state, initial);
    expect(result.dungeon).toMatchObject({
      position: "D",
      phase: "ready",
      cursor: 7,
      scoutBonus: true,
      gold: 10,
      exploration: null,
    });
    expect(result.dungeon!.heroes[0]!.stress).toBe(2);
    expect(result.dungeon!.rooms).toEqual(initial.dungeon!.rooms);
    expect(log.reduce((s, c) => applyCommand(s, c).state, initial)).toEqual(result);
    expect(initial).toEqual(before);
    expect(applyCommand(result, log[3]!).state).toBe(result);
    const routed = pick(applyCommand(result, { type: "beginDungeonExploration" }).state, "A").state;
    expect(routed.dungeon!.exploration!.dicePerHero).toBe(1);
    expect(routed.dungeon!.scoutBonus).toBe(false);
  });
  it("多人压力同时到 10 共用有限意志牌堆；没有侦察揭示 / 赠送减骰", () => {
    const initial = patch(setup(9), {
      heroes: [
        { id: "hero-0", stress: 9 },
        { id: "hero-1", stress: 9 },
        { id: "hero-2", stress: 2 },
      ],
    });
    const result = back(initial);
    expect(result.state.dungeon).toMatchObject({
      position: "G",
      phase: "ready",
      scoutBonus: false,
      backtracking: null,
    });
    expect(result.state.dungeon!.heroes.map((h) => h.stress)).toEqual([0, 0, 3]);
    expect(new Set(result.state.dungeon!.heroes.slice(0, 2).map((h) => h.resolveCardId)).size).toBe(
      2,
    );
    expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(2);
    expect(result.state.dungeon!.rooms).toEqual(initial.dungeon!.rooms);
    expect(back(initial)).toEqual(result);
  });
  it("缺资料保留已支付压力与原位置；修复后只移动一次，结果等于完整资料路径", () => {
    const initial = setup(9, []);
    const blocked = back(initial).state;
    expect(blocked.dungeon).toMatchObject({
      position: "D",
      phase: "blockedPressure",
      cursor: 7,
      backtracking: { from: "D", to: "G" },
    });
    expect(blocked.dungeon!.heroes[0]!.stress).toBe(10);
    expect(applyCommand(blocked, { type: "resolveDungeonPressure" }).state).toBe(blocked);
    const repaired = patch(blocked, { resolveCards: catalog.cards as ResolveCard[] });
    const resumed = applyCommand(repaired, { type: "resolveDungeonPressure" }).state;
    expect(resumed).toEqual(back(setup(9)).state);
    expect(applyCommand(resumed, { type: "resolveDungeonPressure" }).state).toBe(resumed);
  });
  it("心脏病死亡停在原房间，不能再次返回或掷骰", () => {
    const initial = patch(setup(9), {
      heroes: [
        { id: "hero-0", stress: 9, resolveTested: true, resolveCardId: catalog.cards[0]!.id },
      ],
    });
    const result = back(initial);
    expect(result.state.dungeon).toMatchObject({
      phase: "awaitingReplacement",
      position: "D",
      cursor: 7 + 4, // R-091：五张意志卡洗回；心脏病本身不掷骰。
    });
    expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
    for (const type of ["beginDungeonBacktrack", "rollDungeonExploration"] as const)
      expect(applyCommand(result.state, { type }).state).toBe(result.state);
  });
  it.each(["trap", "dark", "lair", "curio"] as const)(
    "返回未清理 %s 不消除代币 / 绕过房间结算",
    (kind) => {
      const initial = setup();
      const s = patch(initial, {
        rooms: initial.dungeon!.rooms.map((r) =>
          r.id === "G" ? { ...r, kind, cleared: false } : r,
        ),
      });
      const result = back(s).state;
      expect(result.dungeon).toMatchObject({ position: "G", phase: "awaitingRoom", gold: 0 });
      expect(result.dungeon!.rooms.find((r) => r.id === "G")).toMatchObject({
        kind,
        cleared: false,
      });
      expect(applyCommand(result, { type: "beginDungeonBacktrack" }).state).toBe(result);
    },
  );
  it("真实种子31 零骰 Radiant 探索登记边后返回；灰点同样按边收费（R-068）", () => {
    const initial = createDungeonSandbox(31, layout, distribution, "radiant", "G");
    const s = patch(initial, {
      scoutBonus: true,
      rooms: initial.dungeon!.rooms.map((r) => (r.id === "G" ? { ...r, cleared: true } : r)),
    });
    const routed = pick(applyCommand(s, { type: "beginDungeonExploration" }).state, "D").state;
    const arrived = applyCommand(routed, { type: "rollDungeonExploration" }).state;
    expect(arrived.dungeon!.traversedCorridors).toEqual([["G", "D"]]);
    expect(back(arrived).state.dungeon).toMatchObject({ position: "G", cursor: 7, phase: "ready" });
    const gray = patch(setup(), {
      layout: {
        ...setup().dungeon!.layout,
        nodes: setup().dungeon!.layout.nodes.map((n) =>
          n.id === "G" ? { ...n, kind: "dot" as const } : n,
        ),
      },
    });
    expect(back(gray).state.dungeon).toMatchObject({ position: "G", phase: "ready" });
    expect(back(gray).state.dungeon!.heroes[0]!.stress).toBe(1);
  });
});

it("灰点长走廊、起点出入与岔路换边每段压力+1，不掷骰、不重复奖励（R-068）", () => {
  const base = setup();
  const initial = patch(base, {
    layout: {
      ...base.dungeon!.layout,
      nodes: [...base.dungeon!.layout.nodes, { id: "X", kind: "dot", x: 50, y: 50 }],
      edges: [
        ...base.dungeon!.layout.edges.filter(
          ([a, b]) => !([a, b].includes("D") && [a, b].includes("G")),
        ),
        ["G", "X"],
        ["X", "D"],
      ],
    },
    visited: ["S", "G", "X", "D", "F"],
    traversedCorridors: [
      ["S", "G"],
      ["G", "X"],
      ["X", "D"],
      ["G", "F"],
    ],
    scoutBonus: true,
    gold: 10,
    rooms: base.dungeon!.rooms.map((r) =>
      ["D", "G", "F"].includes(r.id) ? { ...r, revealed: true, cleared: true } : r,
    ),
  });
  const before = structuredClone(initial);
  const route = ["X", "G", "S", "G", "F", "G", "X", "D"];
  const replay = () =>
    route.reduce((state, id, index) => {
      const result = pick(begin(state), id);
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
      expect(result.state.dungeon).toMatchObject({
        position: id,
        phase: "ready",
        gold: 10,
        cursor: 7,
        scoutBonus: true,
      });
      expect(result.state.dungeon!.heroes[0]!.stress).toBe(index + 1);
      return result.state;
    }, initial);
  expect(replay()).toEqual(replay());
  expect(initial).toEqual(before);
  expect(replay().dungeon!.rooms).toEqual(initial.dungeon!.rooms);
  expect(
    applyCommand(patch(initial, { position: "S" }), { type: "scoutDungeon" }).events[0]!.message,
  ).toContain("R-068");
});
