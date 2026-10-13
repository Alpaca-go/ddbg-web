import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import stats from "../../data/normalized/corebox/hero_stat.json";
import layouts from "../../data/normalized/corebox/dungeon_layouts.json";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { canLeaveDungeon } from "./dungeon-exit";

const setup = (position = "G", mode: "standard" | "radiant" = "standard") =>
  createDungeonSandbox(
    1,
    layout,
    distribution,
    mode,
    position,
    ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
      const stat = stats.cards.find((s) => s.name === name && s.level === 1)!;
      return {
        id: `hero-${i}`,
        stress: 0,
        wounds: 0,
        level: 1,
        life: stat.life,
        attributesVerified: stat.attributesVerified,
        stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      };
    }),
    [],
    {
      dungeonLevel: 1,
      light: 5,
      provisions: [{ id: "torch-1", face: "torch" }],
    },
  );
function choose(state: GameState, optionId: string) {
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  });
}
function selectedRoute(initial = setup()) {
  const choosing = applyCommand(initial, { type: "beginDungeonExploration" }).state;
  return choose(choosing, choosing.dungeon!.pending!.options[0]!.id).state;
}

describe("R14 掷探索骰前离开地牢", () => {
  it.each(["S", "G", "dot"])(
    "从 %s（起点 / 房间 / 灰点）全员同意离开，保留所有资源",
    (position) => {
      const dotLayout = layouts.layouts.find((l) => l.nodes.some((n) => n.kind === "dot"))!;
      const base =
        position === "dot"
          ? createDungeonSandbox(
              1,
              dotLayout,
              distribution,
              "standard",
              dotLayout.nodes.find((n) => n.kind === "dot")!.id,
            )
          : setup(position);
      const initial: GameState = {
        ...base,
        dungeon: {
          ...base.dungeon!,
          gold: 23,
          heroes: base.dungeon!.heroes.map((h) => ({ ...h, wounds: 2, stress: 3 })),
        },
      };
      const before = structuredClone(initial);
      const pending = applyCommand(initial, { type: "leaveDungeon" });
      expect(pending.pendingChoice?.options.map((o) => o.id)).toEqual(["agree", "decline"]);
      expect(pending.state.dungeon!.phase).toBe("ready");
      const exited = choose(pending.state, "agree");
      expect(exited.state.dungeon).toEqual({
        ...initial.dungeon,
        decision: initial.dungeon!.decision + 1,
        phase: "exited",
      });
      expect(exited.events[0]!.message).toContain("等待任务 XP / 回村接口");
      expect(initial).toEqual(before);
    },
  );

  it("取消恢复选路后未掷骰窗口；非法和过期确认原子拒绝", () => {
    const initial = selectedRoute();
    const pending = applyCommand(initial, { type: "leaveDungeon" }).state;
    expect(choose(pending, "bad").state).toBe(pending);
    const cancelled = choose(pending, "decline").state;
    expect(cancelled.dungeon).toEqual({
      ...initial.dungeon,
      decision: initial.dungeon!.decision + 1,
    });
    const next = applyCommand(cancelled, { type: "leaveDungeon" }).state;
    expect(
      applyCommand(next, {
        type: "resolveChoice",
        choiceId: pending.dungeon!.pending!.id,
        optionId: "agree",
      }).state,
    ).toBe(next);
    expect(choose(next, "agree").state.dungeon!.position).toBe(initial.dungeon!.position);
    expect(choose(next, "agree").state.dungeon!.cursor).toBe(initial.dungeon!.cursor);
  });

  it("离开决定冻结掷骰、补给、房间准备及导航；离开后禁止继续命令", () => {
    const initial = selectedRoute();
    const pending = applyCommand(initial, { type: "leaveDungeon" }).state;
    const commands: Command[] = [
      { type: "leaveDungeon" },
      { type: "scoutDungeon" },
      { type: "beginDungeonExploration" },
      { type: "beginDungeonBacktrack" },
      { type: "rollDungeonExploration" },
      { type: "prepareDungeonBattle" },
      { type: "prepareDungeonMonsters" },
      { type: "startDungeonBattle" },
      { type: "resolveDungeonRoom" },
      { type: "useProvision", provisionId: "torch-1", targetId: "hero-0", effect: "raiseLight" },
    ];
    const exited = choose(pending, "agree").state;
    for (const state of [pending, exited])
      for (const command of commands) {
        const result = applyCommand(state, command);
        expect(result.state).toBe(state);
        expect(result.events[0]!.type).toBe("commandRefused");
      }
    expect(choose(pending, "agree").state).toEqual(exited);
    expect(
      applyCommand(exited, {
        type: "resolveChoice",
        choiceId: pending.dungeon!.pending!.id,
        optionId: "agree",
      }).state,
    ).toBe(exited);
  });

  it("真实探索一旦掷骰就不能离开，包括零骰流程的已入场停点", () => {
    const selected = selectedRoute();
    const rolled = applyCommand(selected, { type: "rollDungeonExploration" }).state;
    expect(rolled.dungeon!.exploration!.rolls).toHaveLength(8);
    expect(canLeaveDungeon(rolled)).toBe(false);
    expect(applyCommand(rolled, { type: "leaveDungeon" }).state).toBe(rolled);
    const scouted = choose(
      applyCommand(setup("G", "radiant"), { type: "scoutDungeon" }).state,
      "agree",
    ).state;
    const zeroDice = selectedRoute(scouted);
    expect(zeroDice.dungeon!.exploration!.dicePerHero).toBe(0);
    expect(canLeaveDungeon(zeroDice)).toBe(true);
    const entered = applyCommand(zeroDice, { type: "rollDungeonExploration" }).state;
    expect(entered.dungeon!.phase).toBe("awaitingRoom");
    expect(canLeaveDungeon(entered)).toBe(false);
    expect(applyCommand(entered, { type: "leaveDungeon" }).state).toBe(entered);
  });

  it("不越过房间、压力、Curio、死亡替换与战斗停点；四轮回传可离开", () => {
    const base = setup();
    for (const phase of [
      "awaitingRoom",
      "blockedPressure",
      "awaitingCurio",
      "awaitingReplacement",
      "inBattle",
    ] as const) {
      const state = { ...base, dungeon: { ...base.dungeon!, phase } };
      expect(canLeaveDungeon(state)).toBe(false);
      expect(applyCommand(state, { type: "leaveDungeon" }).state).toBe(state);
    }
    const dead = {
      ...base,
      dungeon: { ...base.dungeon!, heroes: [{ id: "dead", stress: 0, dead: true }] },
    };
    expect(canLeaveDungeon(dead)).toBe(false);
    const fled = { ...base, dungeon: { ...base.dungeon!, mustLeaveRoomId: "G" } };
    expect(canLeaveDungeon(fled)).toBe(true);
    expect(
      choose(applyCommand(fled, { type: "leaveDungeon" }).state, "agree").state.dungeon!.phase,
    ).toBe("exited");
  });

  it("同种子与同命令日志回放相同；侦察已付压力和减骰记录不重置", () => {
    const commands: Command[] = [
      { type: "scoutDungeon" },
      { type: "resolveChoice", choiceId: "dungeon-scout:0", optionId: "agree" },
      { type: "leaveDungeon" },
      { type: "resolveChoice", choiceId: "dungeon-exit:1", optionId: "decline" },
      { type: "leaveDungeon" },
      { type: "resolveChoice", choiceId: "dungeon-exit:2", optionId: "agree" },
    ];
    const replay = () => commands.reduce((s, c) => applyCommand(s, c).state, setup());
    expect(replay()).toEqual(replay());
    expect(replay().dungeon!.phase).toBe("exited");
    expect(replay().dungeon!.scoutBonus).toBe(true);
    expect(replay().dungeon!.heroes.every((h) => h.stress === 1)).toBe(true);
    expect(replay().dungeon!.cursor).toBe(setup().dungeon!.cursor);
  });
});
