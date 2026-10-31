import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import statData from "../../data/normalized/corebox/hero_stat.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { createDungeonSandbox } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { ProvisionFace } from "./loot";
const stats = normalizedHeroStatFileSchema.parse(statData).cards.map((s) => ({
  id: s.id,
  name: s.name,
  level: s.level,
  life: s.life,
  dodge: s.dodge,
  attributesVerified: s.attributesVerified,
}));
const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
  const stat = stats.find((s) => s.name === name && s.level === 1)!;
  return {
    id: `hero-${i}`,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    heroStatId: stat.id,
    level: 1,
    life: stat.life,
    attributesVerified: true,
    wounds: 0,
    stress: 0,
  };
});
function setup(seed: number, mode: "standard" | "radiant") {
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
    { heroStats: stats, skills: [], monsters: [] },
    true,
  );
}
function choose(state: GameState, optionId: string) {
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  });
}
it.each(["standard", "radiant"] as const)(
  "%s真实八颗开局池包含Bandage / Potion仍可探索并进入Empty；命令回放",
  (mode) => {
    // 固定种子75：自然分布的G为Empty；两模式首段均无Curio，不修改任务代币或骰面。
    const initial = setup(75, mode);
    const before = structuredClone(initial);
    const log: Command[] = [];
    let state = initial;
    const dispatch = (command: Command) => {
      log.push(command);
      const result = applyCommand(state, command);
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
      state = result.state;
      return result;
    };
    const pick = (optionId: string) =>
      dispatch({ type: "resolveChoice", choiceId: state.dungeon!.pending!.id, optionId });
    dispatch({ type: "rollDungeonProvisions" });
    while (state.dungeon!.pending) pick("bandage");
    const pool = state.dungeon!.explorationSetup!.provisions;
    expect(pool).toHaveLength(8);
    expect(pool.some((p) => p.face === "bandage")).toBe(true);
    expect(pool.some((p) => p.face === "potion")).toBe(true);
    expect(state.dungeon!.rooms.find((r) => r.id === "G")).toMatchObject({
      kind: "empty",
      revealed: false,
    });
    const count = mode === "standard" ? 8 : 4;
    expect(state.dungeon!.cursor).toBe(7 + count);
    dispatch({ type: "beginDungeonExploration" });
    pick("G");
    expect(state.dungeon!.position).toBe("S");
    dispatch({ type: "rollDungeonExploration" });
    const rolls = state.dungeon!.exploration!.rolls!;
    expect(rolls).toHaveLength(count);
    expect(state.dungeon!.cursor).toBe(7 + count * 2);
    expect(state.dungeon!.explorationSetup!.provisions).toEqual(pool);
    for (let choices = 0; state.dungeon!.pending && choices < 24; choices++) {
      const pending = (state as GameState).dungeon!.pending!;
      if (pending.id.startsWith("dungeon-die:")) pick(pending.options[0]!.id);
      else {
        // 不用补给抵消；所有危险照真实骰面与获批英雄属性结算。
        for (const p of pool.filter((p) => p.face === "bandage" || p.face === "potion")) {
          expect(pending.options.some((o) => o.id === `use:${p.id}`)).toBe(false);
          expect(
            applyCommand(state, {
              type: "resolveChoice",
              choiceId: pending.id,
              optionId: `use:${p.id}`,
            }).state,
          ).toBe(state);
        }
        pick(pending.options.some((o) => o.id === "suffer") ? "suffer" : "attack");
      }
    }
    expect(state.dungeon).toMatchObject({ phase: "ready", position: "G", pending: null });
    expect(state.dungeon!.rooms.find((r) => r.id === "G")).toMatchObject({
      revealed: true,
      cleared: true,
    });
    expect(state.dungeon!.exploration!.rolls!.every((r) => r.resolved)).toBe(true);
    expect(state.dungeon!.cursor).toBe(
      7 + count * 2 + rolls.filter((r) => r.face === "trap").length,
    );
    expect(state.dungeon!.explorationSetup!.provisions).toEqual(pool);
    expect(state.dungeon!.gold).toBe(mode === "standard" ? 10 : 20);
    for (const [face, effect] of [
      ["bandage", "heal"],
      ["potion", "reduceStress"],
    ] as const) {
      const provision = state.dungeon!.explorationSetup!.provisions.find((p) => p.face === face)!;
      dispatch({ type: "useProvision", provisionId: provision.id, targetId: "hero-0", effect });
    }
    expect(state.dungeon!.explorationSetup!.provisions).toHaveLength(6);
    expect(log.reduce((s, c) => applyCommand(s, c).state, initial)).toEqual(state);
    expect(initial).toEqual(before);
  },
);

it("五种具名面可同池；未知 / Wild / 重复 / 无ID / 超容量仍在掷骰前原子拒绝", () => {
  const initial = setup(75, "standard");
  const pool = (["food", "bandage", "potion", "torch", "tool"] as const).map((face) => ({
    id: face,
    face,
  }));
  const ready = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      phase: "ready" as const,
      explorationSetup: { ...initial.dungeon!.explorationSetup!, provisions: pool },
    },
  };
  const routed = choose(applyCommand(ready, { type: "beginDungeonExploration" }).state, "G").state;
  const rolled = applyCommand(routed, { type: "rollDungeonExploration" });
  expect(rolled.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(rolled.state.dungeon!.explorationSetup!.provisions).toEqual(pool);
  const badPools = [
    [{ id: "wild", face: "wild" as ProvisionFace }],
    [{ id: "unknown", face: "unknown" as ProvisionFace }],
    [{ id: "", face: "bandage" as const }],
    [...pool, pool[1]!],
    Array.from({ length: 17 }, (_, i) => ({ id: String(i), face: "potion" as const })),
  ];
  for (const provisions of badPools) {
    const bad = {
      ...routed,
      dungeon: {
        ...routed.dungeon!,
        explorationSetup: { ...routed.dungeon!.explorationSetup!, provisions },
      },
    };
    const saved = structuredClone(bad);
    expect(applyCommand(bad, { type: "rollDungeonExploration" }).state).toBe(bad);
    expect(bad).toEqual(saved);
  }
});
