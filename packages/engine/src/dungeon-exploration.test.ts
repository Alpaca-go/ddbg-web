import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import stats from "../../data/normalized/corebox/hero_stat.json";
import catalog from "../../data/normalized/corebox/virtue_affliction.json";
import layouts from "../../data/normalized/corebox/dungeon_layouts.json";
import type { ExplorationFace } from "../../data/src/exploration";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState } from "./dungeon";
import { continueDungeonExploration } from "./dungeon-exploration";
import type { ResolveCard } from "./pressure";

const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
  const stat = stats.cards.find((c) => c.level === 1 && c.name === name)!;
  return {
    id: `hero-${i}`,
    stance: stances[i]!,
    level: stat.level,
    life: stat.life,
    attributesVerified: stat.attributesVerified,
    wounds: 0,
    stress: 0,
  };
});
const provisions = ["tool", "tool", "tool", "tool", "torch", "food"].map((face, i) => ({
  id: `p${i}`,
  face: face as "tool" | "torch" | "food",
}));
const setup = (
  party: DungeonState["heroes"] = heroes,
  mode: DungeonState["mode"] = "standard",
  seed = 31,
) =>
  createDungeonSandbox(
    seed,
    layout,
    distribution,
    mode,
    "G",
    party,
    catalog.cards as ResolveCard[],
    {
      dungeonLevel: 1,
      light: 5,
      provisions,
    },
  );
const choose = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
const route = (s: GameState, to = "D") =>
  choose(applyCommand(s, { type: "beginDungeonExploration" }).state, to).state;
const roll = (s: GameState) => applyCommand(route(s), { type: "rollDungeonExploration" }).state;
function scene(
  face: ExplorationFace,
  overrides: Partial<DungeonState["heroes"][number]> = {},
  seed = 31,
) {
  const s = roll(setup([{ ...heroes[0]!, ...overrides }], "standard", seed));
  return continueDungeonExploration({
    state: {
      ...s,
      dungeon: {
        ...s.dungeon!,
        pending: null,
        exploration: {
          ...s.dungeon!.exploration!,
          rolls: [{ id: "hero-0:1", heroId: "hero-0", face, resolved: false }],
        },
      },
    },
    events: [],
  }).state;
}

describe("单走廊 → Empty（R14–R15、R-012、R-013、R-026、R-048）", () => {
  it("真实种子 31：八骰、五类结果，逐个使用补给后才移动；完整命令回放一致、输入不变", () => {
    const initial = setup();
    const before = structuredClone(initial);
    const log: Command[] = [];
    let s = initial;
    const dispatch = (c: Command) => {
      log.push(c);
      s = applyCommand(s, c).state;
    };
    const pick = (id: string) =>
      dispatch({ type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId: id });
    dispatch({ type: "beginDungeonExploration" });
    pick("D");
    dispatch({ type: "rollDungeonExploration" });
    expect(s.dungeon!.exploration!.rolls!.map((r) => r.face)).toEqual([
      "darkness",
      "trap",
      "blank",
      "rubble",
      "trap",
      "blank",
      "hunger",
      "trap",
    ]);
    expect(s.dungeon).toMatchObject({ cursor: 15, position: "G" });
    while (s.dungeon!.pending) {
      expect(s.dungeon!.position).toBe("G");
      pick(s.dungeon!.pending!.options[0]!.id);
    }
    expect(s.dungeon).toMatchObject({
      position: "D",
      phase: "ready",
      scoutBonus: false,
      cursor: 15,
      explorationSetup: { provisions: [] },
    });
    expect(s.dungeon!.rooms.find((r) => r.id === "D")).toMatchObject({
      kind: "empty",
      revealed: true,
      cleared: true,
    });
    expect(s.dungeon!.heroes.every((h) => h.wounds === 0 && h.stress === 0)).toBe(true);
    expect(log.reduce((state, c) => applyCommand(state, c).state, setup())).toEqual(s);
    expect(initial).toEqual(before);
    expect(applyCommand(s, { type: "rollDungeonExploration" }).state).toBe(s);
    expect(
      applyCommand(s, { type: "beginDungeonExploration" }).pendingChoice!.options.some(
        (o) => o.id === "G",
      ),
    ).toBe(false);
  });
  it("英雄数组乱序仍按姿态结算；自己两骰可倒序，不能选另一英雄 / 重掷 / 重复选择", () => {
    const s = roll(setup([...heroes].reverse()));
    expect(s.dungeon!.pending!.options.map((o) => o.id)).toEqual(["hero-0:1", "hero-0:2"]);
    expect(choose(s, "hero-1:1").state).toBe(s);
    expect(applyCommand(s, { type: "rollDungeonExploration" }).state).toBe(s);
    const hazard = choose(s, "hero-0:2");
    expect(hazard.pendingChoice!.prompt).toContain("Trap");
    expect(choose(hazard.state, "attack").state).toBe(hazard.state);
    const next = choose(hazard.state, "use:p0").state;
    expect(next.dungeon!.pending!.options.map((o) => o.id)).toEqual(["hero-0:1"]);
    expect(
      applyCommand(next, {
        type: "resolveChoice",
        choiceId: hazard.pendingChoice!.id,
        optionId: "use:p0",
      }).state,
    ).toBe(next);
  });
  it.each(["hunger", "rubble", "darkness"] as const)(
    "%s：只影响掷骰英雄；伤口不按攻击伤害修正",
    (face) => {
      const s = choose(scene(face), "hero-0:1").state;
      const result = choose(s, "suffer").state;
      expect(result.dungeon!.heroes[0]).toMatchObject({
        wounds: face === "hunger" ? 2 : face === "rubble" ? 1 : 0,
        stress: face === "rubble" ? 1 : face === "darkness" ? 2 : 0,
      });
      expect(result.dungeon).toMatchObject({ phase: "ready", position: "D", cursor: 9 });
      expect(result.dungeon!.explorationSetup!.provisions).toHaveLength(6);
    },
  );
  it("压力达到 10：抽完整意志牌后续接探索，不揭示侦察邻居、不重掷、不送减骰", () => {
    const s = choose(scene("darkness", { stress: 9 }), "hero-0:1").state;
    const result = choose(s, "suffer");
    expect(result.state.dungeon).toMatchObject({
      position: "D",
      phase: "ready",
      scoutBonus: false,
    });
    expect(result.state.dungeon!.heroes[0]).toMatchObject({ stress: 0, resolveTested: true });
    expect(result.events.some((e) => e.type === "resolveTested")).toBe(true);
    expect(result.state.dungeon!.rooms.filter((r) => r.revealed).map((r) => r.id)).toEqual([
      "D",
      "G",
    ]);
  });
  it("压力资料缺失：已结算骰面保存，补齐后恢复不重复扣压力；已有卡死亡停在原房间", () => {
    const base = scene("darkness", { stress: 9 });
    const missing = { ...base, dungeon: { ...base.dungeon!, resolveCards: [] } };
    const blocked = choose(choose(missing, "hero-0:1").state, "suffer").state;
    expect(blocked.dungeon).toMatchObject({ phase: "blockedPressure", position: "G" });
    expect(blocked.dungeon!.exploration!.rolls![0]!.resolved).toBe(true);
    const repaired = {
      ...blocked,
      dungeon: { ...blocked.dungeon!, resolveCards: catalog.cards as ResolveCard[] },
    };
    expect(applyCommand(repaired, { type: "resolveDungeonPressure" }).state.dungeon).toMatchObject({
      position: "D",
      phase: "ready",
      scoutBonus: false,
    });
    const death = choose(
      choose(
        scene("darkness", { stress: 9, resolveCardId: catalog.cards[0]!.id, resolveTested: true }),
        "hero-0:1",
      ).state,
      "suffer",
    ).state;
    expect(death.dungeon).toMatchObject({
      position: "G",
      phase: "awaitingReplacement",
      cursor: 9 + 4,
    }); // R-091意志洗回。
    expect(death.dungeon!.heroes[0]!.dead).toBe(true);
  });
  it("首次到死门不掷骰；已在死门受伤消费一次骰，死亡冻结移动", () => {
    const life = heroes[0]!.life;
    const first = choose(
      choose(scene("hunger", { wounds: life - 1 }), "hero-0:1").state,
      "suffer",
    ).state;
    expect(first.dungeon!.cursor).toBe(9);
    expect(first.dungeon!.heroes[0]!.wounds).toBe(life);
    const atDoor = choose(
      choose(scene("hunger", { wounds: life }, 2), "hero-0:1").state,
      "suffer",
    ).state;
    expect(atDoor.dungeon!.cursor).toBe(10);
    expect(atDoor.dungeon!.heroes[0]!.dead).toBe(true);
    expect(atDoor.dungeon).toMatchObject({ position: "G", phase: "awaitingReplacement" });
  });
  it.each(["trap", "curio"] as const)(
    "%s 未接线选项不消费骰 / 补给、不移动、不能伪装完成",
    (face) => {
      const s = choose(scene(face), "hero-0:1").state;
      const id = face === "trap" ? "attack" : "draw";
      expect(choose(s, id).state).toBe(s);
      if (face === "curio") expect(choose(s, "use:p4").state).toBe(s);
    },
  );
  it("缺 Life、重复姿态、未知补给或非法光照在掷骰前拒绝，输入和游标不变", () => {
    const initial = route(setup());
    const d = initial.dungeon!;
    const bad = [
      {
        ...d,
        heroes: d.heroes.map((h) => {
          const missing = { ...h };
          delete missing.life;
          return missing;
        }),
      },
      { ...d, heroes: d.heroes.map((h) => ({ ...h, stance: "aggressive" as const })) },
      {
        ...d,
        explorationSetup: {
          ...d.explorationSetup!,
          provisions: [{ id: "p", face: "wild" as "tool" }],
        },
      },
      ...[-1, 6, 2.5, NaN].map((light) => ({
        ...d,
        explorationSetup: { ...d.explorationSetup!, light },
      })),
    ];
    for (const dungeon of bad) {
      const s = { ...initial, dungeon };
      expect(applyCommand(s, { type: "rollDungeonExploration" }).state).toBe(s);
    }
  });
  it("Radiant 侦察后零骰立即进入 Empty，下一次恢复一骰；非 Empty 停在房间接口", () => {
    const initial = setup(undefined, "radiant");
    const scouted = choose(applyCommand(initial, { type: "scoutDungeon" }).state, "agree").state;
    const moved = applyCommand(route(scouted), { type: "rollDungeonExploration" }).state;
    expect(moved.dungeon).toMatchObject({ position: "D", phase: "ready", cursor: 7 });
    const next = route(moved, "E");
    expect(next.dungeon!.exploration!.dicePerHero).toBe(1);
    const room = applyCommand(
      route({ ...scouted, dungeon: { ...scouted.dungeon!, position: "D" } }, "A"),
      { type: "rollDungeonExploration" },
    ).state;
    expect(room.dungeon).toMatchObject({ position: "A", phase: "awaitingRoom" });
    expect(room.dungeon!.rooms.find((r) => r.id === "A")!.cleared).toBeUndefined();
  });
  it("实际 p3 灰点必须停留；下段重新掷骰，不能从灰点侦察", () => {
    const initial = createDungeonSandbox(
      31,
      layouts.layouts[2],
      distribution,
      "radiant",
      "A",
      heroes,
      catalog.cards as ResolveCard[],
      { dungeonLevel: 1, light: 5, provisions },
    );
    const scouted = choose(applyCommand(initial, { type: "scoutDungeon" }).state, "agree").state;
    const dot = applyCommand(route(scouted, "X"), { type: "rollDungeonExploration" }).state;
    expect(dot.dungeon).toMatchObject({ position: "X", phase: "ready", cursor: 7 });
    expect(applyCommand(dot, { type: "scoutDungeon" }).state).toBe(dot);
    expect(route(dot, "D").dungeon!.exploration!.dicePerHero).toBe(1);
  });
});
