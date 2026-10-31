import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox, applyDungeonCommand } from "./dungeon";
import { nextProvisionFace } from "./loot";

const heroes = (["aggressive", "defensive", "ranged", "support"] as const).map((stance, i) => ({
  id: `h${i}`,
  stance,
  stress: 0,
}));
function setup(mode: "standard" | "radiant", seed = 1) {
  return createDungeonSandbox(
    seed,
    layout,
    distribution,
    mode,
    "S",
    heroes,
    [],
    { dungeonLevel: 1, light: 5, provisions: [] },
    undefined,
    undefined,
    undefined,
    undefined,
    true,
  );
}
function choose(state: GameState, face = "torch") {
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId: face,
  });
}
describe("地牢开局补给 R12 / R37", () => {
  it.each(["standard", "radiant"] as const)(
    "%s按共享游标采样；对应英雄自选；完整命令回放",
    (mode) => {
      const initial = setup(mode);
      const before = structuredClone(initial);
      const start: Command = { type: "rollDungeonProvisions" };
      const log: Command[] = [start];
      let result = applyCommand(initial, start);
      const count = mode === "standard" ? 8 : 4;
      expect(initial).toEqual(before);
      expect(result.state.dungeon!.cursor).toBe(initial.dungeon!.cursor + count);
      const rolls = result.events.filter((e) => e.type === "provisionRolled");
      expect(rolls.map((e) => e.face)).toEqual(
        Array.from({ length: count }, (_, i) =>
          nextProvisionFace(initial.seed, initial.dungeon!.cursor + i),
        ),
      );
      expect(rolls.map((e) => e.actorId)).toEqual(
        mode === "standard"
          ? ["h0", "h0", "h1", "h1", "h2", "h2", "h3", "h3"]
          : ["h0", "h1", "h2", "h3"],
      );
      const choices = result.state.dungeon!.startingProvisionChoices!;
      expect(choices).toHaveLength(
        rolls.filter((e) => e.face === "wild").length + (mode === "radiant" ? 4 : 0),
      );
      for (const entry of choices) {
        expect(result.pendingChoice?.actorId).toBe(entry.actorId);
        const prior = result.state;
        const command: Command = {
          type: "resolveChoice",
          choiceId: prior.dungeon!.pending!.id,
          optionId: "torch",
        };
        log.push(command);
        result = applyCommand(prior, command);
        expect(result.state.dungeon!.cursor).toBe(initial.dungeon!.cursor + count);
        expect(applyCommand(result.state, command).state).toBe(result.state);
      }
      const d = result.state.dungeon!;
      expect(d.phase).toBe("ready");
      expect(d.explorationSetup!.provisions).toHaveLength(8);
      expect(new Set(d.explorationSetup!.provisions.map((p) => p.id)).size).toBe(8);
      expect(d.rooms).toEqual(initial.dungeon!.rooms);
      expect(d.heroes).toEqual(initial.dungeon!.heroes);
      expect(d.position).toBe("S");
      expect(d.gold).toBe(mode === "standard" ? 10 : 20);
      expect(log.reduce((s, c) => applyCommand(s, c).state, initial)).toEqual(result.state);
      expect(applyCommand(result.state, start).state).toBe(result.state);
      expect(
        applyCommand(result.state, { type: "beginDungeonExploration" }).pendingChoice,
      ).toBeDefined();
    },
  );
  it("选面冻结其他命令；陈旧 / Wild / 未提供选项原子拒绝", () => {
    const initial = setup("radiant");
    for (const type of [
      "beginDungeonExploration",
      "scoutDungeon",
      "leaveDungeon",
      "restDungeon",
      "ping",
    ] as const)
      expect(applyCommand(initial, { type, message: "test" }).state).toBe(initial);
    expect(applyDungeonCommand(initial, { type: "beginDungeonExploration" }).state).toBe(initial);
    const state = applyCommand(initial, { type: "rollDungeonProvisions" }).state;
    expect(applyCommand(state, { type: "rollDungeonProvisions" }).state).toBe(state);
    expect(choose(state, "wild").state).toBe(state);
    expect(choose(state, "bad").state).toBe(state);
    expect(
      applyCommand(state, { type: "resolveChoice", choiceId: "stale", optionId: "food" }).state,
    ).toBe(state);
    const next = choose(state).state;
    expect(next.dungeon!.explorationSetup!.provisions.length).toBe(
      state.dungeon!.explorationSetup!.provisions.length + 1,
    );
    expect(applyCommand(next, { type: "leaveDungeon" }).state).toBe(next);
  });
  it("所有五种具名面均可自选，不保留Wild", () => {
    const state = applyCommand(setup("radiant"), { type: "rollDungeonProvisions" }).state;
    for (const face of ["food", "bandage", "potion", "torch", "tool"])
      expect(choose(state, face).state.dungeon!.explorationSetup!.provisions.at(-1)?.face).toBe(
        face,
      );
  });
  it("缺补给准备、非入口或非四姿态队伍不能创建开局", () => {
    for (const entries of [
      heroes.slice(1),
      heroes.map((h) => ({ ...h, stance: "aggressive" as const })),
      heroes.map((h, i) => ({ ...h, dead: i === 0 })),
    ])
      expect(() =>
        createDungeonSandbox(
          1,
          layout,
          distribution,
          "standard",
          "S",
          entries,
          [],
          { dungeonLevel: 1, light: 5, provisions: [] },
          undefined,
          undefined,
          undefined,
          undefined,
          true,
        ),
      ).toThrow("开局补给");
    expect(() =>
      createDungeonSandbox(
        1,
        layout,
        distribution,
        "standard",
        "G",
        heroes,
        [],
        { dungeonLevel: 1, light: 5, provisions: [] },
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      ),
    ).toThrow("开局补给");
    const legacy = createDungeonSandbox(1, layout, distribution);
    expect(applyCommand(legacy, { type: "rollDungeonProvisions" }).state).toBe(legacy);
  });
  it("上下文 / 池 / 对应英雄漂移拒绝，不提交半截结果", () => {
    const state = applyCommand(setup("radiant"), { type: "rollDungeonProvisions" }).state;
    const d = state.dungeon!;
    const cases = [
      { ...d, cursor: -1 },
      { ...d, position: "G" },
      { ...d, heroes: d.heroes.map((h, i) => ({ ...h, dead: i === 0 })) },
      {
        ...d,
        startingProvisionChoices: d.startingProvisionChoices!.map((c) => ({
          ...c,
          actorId: "missing",
        })),
      },
      { ...d, explorationSetup: { ...d.explorationSetup!, light: 6 } },
      { ...d, explorationSetup: { ...d.explorationSetup!, provisions: [] } },
      { ...d, rooms: d.rooms.map((r, i) => ({ ...r, cleared: i === 0 })) },
    ];
    for (const dungeon of cases) {
      const changed = { ...state, dungeon };
      expect(choose(changed).state).toBe(changed);
    }
  });
  it("无Wild时标准八骰直接就绪", () => {
    let seed = 0;
    while (Array.from({ length: 8 }, (_, i) => nextProvisionFace(seed, 7 + i)).includes("wild"))
      seed++;
    const initial = setup("standard", seed);
    expect(initial.dungeon!.cursor).toBe(7);
    const result = applyCommand(initial, { type: "rollDungeonProvisions" });
    expect(result.pendingChoice).toBeUndefined();
    expect(result.state.dungeon!.phase).toBe("ready");
    expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(8);
  });
});
