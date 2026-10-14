import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { scoutQuestSummarySchema } from "../../data/src/quest-summary";
import { roomDistributionSchema } from "../../data/src/dungeon-layout";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";

const initial = () => createDungeonSandbox(31, layout, distribution, "radiant", "G");
const choose = (state: GameState, optionId: string) =>
  applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  }).state;
const exit = (state: GameState) =>
  choose(applyCommand(state, { type: "leaveDungeon" }).state, "agree");
const summarize = (state: GameState) => applyCommand(state, { type: "summarizeDungeonQuest" });
function cleared(count: number): GameState {
  const base = initial();
  let remaining = count;
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      rooms: base.dungeon!.rooms.map((r) => {
        if (r.kind !== "trap" && r.kind !== "dark" && remaining-- > 0)
          return { ...r, revealed: true, cleared: true };
        return r;
      }),
    },
  };
}

describe("Scout Ahead I 退出摘要（R15、R29、R-038）", () => {
  it.each([0, 1, 2, 3, 4, 5, 6])("清理 %i 间：每两间1 XP，上限3，资源与输入不变", (count) => {
    const state = exit(cleared(count));
    const before = structuredClone(state);
    const result = summarize(state);
    const summary = result.state.dungeon!.questSummary!;
    expect(summary).toMatchObject({
      questId: "quest:p001",
      xpPerHero: Math.floor(count / 2),
      stagecoachXp: Math.floor(count / 2),
      awarded: false,
    });
    expect(summary.clearedRoomIds).toHaveLength(count);
    expect(scoutQuestSummarySchema.safeParse(summary).success).toBe(true);
    expect(result.state.dungeon).toEqual({ ...state.dungeon, questSummary: summary });
    expect(state).toEqual(before);
  });

  it("真实零骰进入Empty → 返回 → 离开：不按访问次数重复计数，日志可回放", () => {
    const base = initial();
    const setup: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        // 与走廊沙盒一致：G / E互换代币，保持完整构成；Trap不能标清理。
        rooms: base.dungeon!.rooms.map((r) =>
          r.id === "G"
            ? { ...r, kind: "empty" as const, cleared: true }
            : r.id === "E"
              ? { ...r, kind: "trap" as const }
              : r,
        ),
      },
    };
    const commands: Command[] = [];
    let state: GameState = setup;
    const dispatch = (command: Command) => {
      const result = applyCommand(state, command);
      expect(
        result.events.some((e) => e.type === "commandRefused"),
        JSON.stringify({ events: result.events, rooms: state.dungeon!.rooms }),
      ).toBe(false);
      commands.push(command);
      state = result.state;
    };
    const pick = (optionId: string) =>
      dispatch({ type: "resolveChoice", choiceId: state.dungeon!.pending!.id, optionId });
    dispatch({ type: "scoutDungeon" });
    pick("agree");
    dispatch({ type: "beginDungeonExploration" });
    pick("D");
    dispatch({ type: "rollDungeonExploration" });
    expect(state.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBe(true);
    dispatch({ type: "beginDungeonBacktrack" });
    pick("G");
    dispatch({ type: "beginDungeonBacktrack" });
    pick("D");
    dispatch({ type: "leaveDungeon" });
    pick("agree");
    dispatch({ type: "summarizeDungeonQuest" });
    expect(state.dungeon!.questSummary).toMatchObject({ clearedRoomIds: ["D", "G"], xpPerHero: 1 });
    expect(commands.reduce((s, c) => applyCommand(s, c).state, setup)).toEqual(state);
    expect(state.dungeon!.heroes.every((h) => h.stress === 3)).toBe(true);
    expect(state.dungeon!.cursor).toBe(setup.dungeon!.cursor);
  });

  it("未退出、全员决定、危险或房间停点不提前结算；重复摘要和退出后命令拒绝", () => {
    const base = cleared(2);
    const pending = applyCommand(base, { type: "leaveDungeon" }).state;
    for (const state of [
      base,
      pending,
      ...(["awaitingRoom", "awaitingHazards", "inBattle", "awaitingReplacement"] as const).map(
        (phase) => ({ ...base, dungeon: { ...base.dungeon!, phase } }),
      ),
    ])
      expect(summarize(state).state).toBe(state);
    const done = summarize(exit(base)).state;
    expect(summarize(done).state).toBe(done);
    expect(applyCommand(done, { type: "scoutDungeon" }).state).toBe(done);
    expect(applyCommand(done, { type: "leaveDungeon" }).state).toBe(done);
  });

  it("旧状态缺身份、未知任务、同ID错代币构成不猜测为Scout Ahead", () => {
    const state = exit(cleared(2));
    const { questDistribution: _removed, ...withoutQuest } = state.dungeon!;
    void _removed;
    const old = { ...state, dungeon: withoutQuest };
    expect(summarize(old).state).toBe(old);
    const approved = roomDistributionSchema.parse(distribution);
    for (const questDistribution of [
      { ...approved, questId: "quest:p002" },
      { ...approved, counts: [{ kind: "empty" as const, count: 8 }] },
    ]) {
      const broken = { ...state, dungeon: { ...state.dungeon!, questDistribution } };
      expect(summarize(broken).state).toBe(broken);
    }
    const originalCounts = structuredClone(distribution.counts);
    expect(initial().dungeon!.questDistribution!.counts).not.toBe(distribution.counts);
    expect(distribution.counts).toEqual(originalCounts);
  });

  it("重复、缺失、非房间节点、种类漂移、未揭示清理与Trap/Dark伪清理原子拒绝", () => {
    const state = exit(cleared(2));
    const rooms = state.dungeon!.rooms;
    const mutations = [
      rooms.slice(1),
      [...rooms.slice(1), rooms[1]!],
      rooms.map((r, i) => (i === 0 ? { ...r, id: "S" } : r)),
      rooms.map((r, i) => (i === 0 ? { ...r, kind: "treasure" as const } : r)),
      rooms.map((r) => (r.cleared ? { ...r, revealed: false } : r)),
      ...(["trap", "dark"] as const).map((kind) =>
        rooms.map((r) => (r.kind === kind ? { ...r, revealed: true, cleared: true } : r)),
      ),
    ];
    for (const rooms of mutations) {
      const broken = { ...state, dungeon: { ...state.dungeon!, rooms } };
      expect(summarize(broken).state).toBe(broken);
    }
  });

  it("摘要支持回村领取标记，仍拒绝错误XP、重复记录、额外字段与驿站乘人数", () => {
    const summary = summarize(exit(cleared(2))).state.dungeon!.questSummary!;
    for (const invalid of [
      { ...summary, xpPerHero: 2 },
      { ...summary, stagecoachXp: 4 },
      { ...summary, clearedRoomIds: ["A", "A"] },
      { ...summary, gold: 20 },
    ])
      expect(scoutQuestSummarySchema.safeParse(invalid).success).toBe(false);
    expect(scoutQuestSummarySchema.safeParse({ ...summary, awarded: true }).success).toBe(true);
  });

  it("遗留未结算骰面 / 房间 / Curio与错误DL不被exited标志绕过", () => {
    const state = exit(cleared(2));
    for (const fields of [
      {
        exploration: {
          from: "G",
          to: "D",
          dicePerHero: 1,
          rolls: [{ id: "hero-0:1", heroId: "hero-0", face: "blank" as const, resolved: false }],
        },
      },
      { roomResolution: { roomId: "G", dungeonLevel: 1, resolvedHeroIds: [], completed: false } },
      { pendingCurioDraw: { rollId: "hero-0:1", optionId: "draw" } },
      { explorationSetup: { dungeonLevel: 2, light: 5, provisions: [] } },
    ]) {
      const broken = { ...state, dungeon: { ...state.dungeon!, ...fields } };
      expect(summarize(broken).state).toBe(broken);
    }
  });
});
