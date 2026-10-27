import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import layouts from "../../data/normalized/corebox/dungeon_layouts.json";
import { dungeonLayoutSchema, roomDistributionSchema } from "../../data/src/dungeon-layout";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";

const setup = (mode: "standard" | "radiant" = "standard") =>
  createDungeonSandbox(1, layout, distribution, mode, "G");
function choose(state: GameState, optionId: string) {
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  });
}
const scout = (state: GameState) =>
  choose(applyCommand(state, { type: "scoutDungeon" }).state, "agree");

describe("Phase 3 首切片（R12、R14、R-013、R-046、R-048）", () => {
  it("印刷 p1：八槽八边；分布守恒、全背面、种子可回放，输入不变", () => {
    const before = structuredClone({ layout, distribution });
    const a = createDungeonSandbox(1, layout, distribution);
    expect(a).toEqual(createDungeonSandbox(1, layout, distribution));
    expect(a.dungeon!.layout.nodes.filter((n) => n.kind === "room")).toHaveLength(8);
    expect(a.dungeon!.layout.edges).toHaveLength(8);
    expect(a.dungeon!.rooms.every((r) => !r.revealed)).toBe(true);
    expect(a.dungeon!.rooms.map((r) => r.kind).sort()).toEqual(
      ["empty", "empty", "dark", "curio", "curio", "lair", "lair", "trap"].sort(),
    );
    expect(a.dungeon!.cursor).toBe(7);
    expect({ layout, distribution }).toEqual(before);
    expect(createDungeonSandbox(2, layout, distribution).dungeon!.rooms).not.toEqual(
      a.dungeon!.rooms,
    );
    expect(layout.review).toBe("confirmed"); // R-065仅批准p1。
  });
  it("坏图、重复种类、数量不符拒绝，不填占位槽", () => {
    for (const broken of [
      { ...layout, edges: [...layout.edges, ["S", "G"]] },
      { ...layout, edges: [["S", "missing"]] },
      { ...layout, nodes: [...layout.nodes, layout.nodes[0]] },
    ])
      expect(dungeonLayoutSchema.safeParse(broken).success).toBe(false);
    expect(
      roomDistributionSchema.safeParse({
        ...distribution,
        counts: [...distribution.counts, distribution.counts[0]],
      }).success,
    ).toBe(false);
    expect(() =>
      createDungeonSandbox(1, layout, { ...distribution, counts: [{ kind: "empty", count: 7 }] }),
    ).toThrow("不一致");
  });
  it("同意前不扣压力；取消和陈旧 / 非法选择不改状态", () => {
    const initial = setup();
    const pending = applyCommand(initial, { type: "scoutDungeon" });
    expect(pending.pendingChoice?.options.map((o) => o.id)).toEqual(["agree", "decline"]);
    expect(pending.state.dungeon!.heroes).toEqual(initial.dungeon!.heroes);
    expect(choose(pending.state, "invalid").state).toBe(pending.state);
    const cancelled = choose(pending.state, "decline").state;
    expect(cancelled.dungeon!.heroes).toEqual(initial.dungeon!.heroes);
    const next = applyCommand(cancelled, { type: "scoutDungeon" }).state;
    expect(
      applyCommand(next, {
        type: "resolveChoice",
        choiceId: pending.pendingChoice!.id,
        optionId: "agree",
      }).state,
    ).toBe(next);
  });
  it.each(["standard", "radiant"] as const)(
    "%s：相邻揭示；仅下次减骰；不消费 RNG、不移动、不解危险",
    (mode) => {
      const initial = setup(mode);
      const after = scout(initial).state;
      expect(after.dungeon!.heroes.map((h) => h.stress)).toEqual([1, 1, 1, 1]);
      expect(after.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual([
        "D",
        "F",
        "G",
        "H",
      ]);
      const pending = applyCommand(after, { type: "beginDungeonExploration" });
      expect(choose(pending.state, "B").state).toBe(pending.state);
      const result = choose(pending.state, "D").state;
      expect(result.dungeon!.exploration).toEqual({
        from: "G",
        to: "D",
        dicePerHero: mode === "radiant" ? 0 : 1,
      });
      expect(result.dungeon).toMatchObject({
        position: "G",
        cursor: 7,
        phase: "awaitingHazards",
        scoutBonus: false,
      });
      expect(applyCommand(result, { type: "scoutDungeon" }).state).toBe(result);
      // 仅测试下一刀结算后交回 ready 的接口；此处不提供跳过结算命令。
      const resumed = { ...result, dungeon: { ...result.dungeon!, phase: "ready" as const } };
      expect(
        choose(applyCommand(resumed, { type: "beginDungeonExploration" }).state, "D").state.dungeon!
          .exploration!.dicePerHero,
      ).toBe(mode === "radiant" ? 1 : 2);
      expect(scout(initial).state).toEqual(after);
    },
  );
  it("灰点阻断视线，不能从灰点侦察；起点不猜规则", () => {
    const graph = {
      ...layout,
      nodes: [...layout.nodes, { id: "dot", kind: "dot", x: 50, y: 45 }],
      edges: [
        ...layout.edges.filter((e) => !(e.includes("G") && e.includes("D"))),
        ["G", "dot"],
        ["dot", "D"],
      ],
    };
    const result = scout(createDungeonSandbox(1, graph, distribution, "standard", "G"));
    expect(result.state.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual([
      "F",
      "G",
      "H",
    ]);
    for (const position of ["dot", "S"]) {
      const initial = createDungeonSandbox(1, graph, distribution, "standard", position);
      expect(applyCommand(initial, { type: "scoutDungeon" }).state).toBe(initial);
    }
  });
  it("压力到 10 停场，不擅自揭示、抽牌或套用未确认光照", () => {
    const initial = createDungeonSandbox(1, layout, distribution, "standard", "G", [
      { id: "hero", stress: 9 },
    ]);
    const result = scout(initial).state;
    expect(result.dungeon).toMatchObject({
      phase: "blockedPressure",
      scoutBonus: false,
      cursor: 7,
    });
    expect(result.dungeon!.heroes[0]!.stress).toBe(10);
    expect(result.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual(["G"]);
    expect(applyCommand(result, { type: "beginDungeonExploration" }).state).toBe(result);
  });
  it("实际 p11 红点 X 为灰点（R-114）；A/B/G Objective 槽（R-115）不再因未解释标记拒沙盒", () => {
    const p11 = dungeonLayoutSchema.parse(layouts.layouts[10]);
    expect(p11.nodes.find((n) => n.id === "X")!.kind).toBe("dot");
    for (const id of ["A", "B", "G"])
      expect(p11.nodes.find((n) => n.id === id)!.slotKind).toBe("objective");
    expect(
      createDungeonSandbox(1, p11, {
        questId: "quest:p011",
        source: "test",
        counts: [{ kind: "empty", count: 16 }],
      }).dungeon!.layout.id,
    ).toBe("quest_map:p011");
  });
  it("实际 p3 分岔灰点挡住远端房间", () => {
    const initial = createDungeonSandbox(1, layouts.layouts[2], distribution, "standard", "D");
    const after = scout(initial).state;
    expect(after.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual([
      "B",
      "D",
      "F",
    ]);
    const routed = choose(
      applyCommand(after, { type: "beginDungeonExploration" }).state,
      "X",
    ).state;
    expect(routed.dungeon!.exploration).toEqual({ from: "D", to: "X", dicePerHero: 1 });
    expect(routed.dungeon!.position).toBe("D");
  });
  it("实际 p12 A/C/D Objective 槽（R-117）不再因未解释标记拒沙盒", () => {
    const p12 = dungeonLayoutSchema.parse(layouts.layouts[11]);
    for (const id of ["A", "C", "D"])
      expect(p12.nodes.find((n) => n.id === id)!.slotKind).toBe("objective");
    expect(
      createDungeonSandbox(1, p12, {
        questId: "quest:p012",
        source: "test",
        counts: [{ kind: "empty", count: 16 }],
      }).dungeon!.layout.id,
    ).toBe("quest_map:p012");
  });
});
