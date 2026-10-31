import { expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "./command";
import { readDungeonQuestProgress } from "./dungeon-quest";
import { warmUpDarkRoomFixture as fixture } from "./test-helpers/warm-up-dark-room";
const resolve = { type: "resolveDungeonRoom" } as const;
const torch = (id = "torch-0"): Command => ({
  type: "useProvision",
  provisionId: id,
  targetId: "hero-0",
  effect: "raiseLight",
});
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r.state;
}
it("任务暗房先结算减光，再花真实Torch恢复光照并清理，不提前发XP", () => {
  const initial = fixture(),
    snapshot = structuredClone(initial);
  expect(applyCommand(initial, torch()).state).toBe(initial);
  const entered = ok(initial, resolve);
  expect(entered.dungeon!.explorationSetup!.light).toBe(4);
  expect(entered.dungeon!.rooms.find((r) => r.id === entered.dungeon!.position)!.cleared).not.toBe(
    true,
  );
  const result = applyCommand(entered, torch()),
    d = result.state.dungeon!;
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(d.explorationSetup!.light).toBe(5);
  expect(d.explorationSetup!.provisions).toHaveLength(3);
  expect(d.rooms.find((r) => r.id === d.position)!.cleared).toBe(true);
  expect(d.heroes.map((h) => h.xp)).toEqual(entered.dungeon!.heroes.map((h) => h.xp));
  expect(d.gold).toBe(entered.dungeon!.gold);
  expect(d.cursor).toBe(entered.dungeon!.cursor);
  expect(applyCommand(JSON.parse(JSON.stringify(entered)), torch())).toEqual(result);
  expect(applyCommand(result.state, torch()).state).toBe(result.state);
  expect(applyCommand(result.state, resolve).state).toBe(result.state);
  expect(initial).toEqual(snapshot);
});
it("三个暗房逐间点亮后摘要为3待发XP；同房再用Torch不重复计数", () => {
  let game = fixture();
  const ids = game.dungeon!.rooms.filter((r) => r.kind === "dark").map((r) => r.id);
  for (const [i, id] of ids.entries()) {
    const d = game.dungeon!;
    game = {
      ...game,
      dungeon: {
        ...d,
        phase: "awaitingRoom",
        position: id,
        rooms: d.rooms.map((r) => (r.id === id ? { ...r, revealed: true } : r)),
      },
    };
    game = ok(ok(game, resolve), torch(`torch-${i}`));
  }
  game = ok(game, torch("torch-3")); // 光照上限5仍可正常用Torch，不增加清理数。
  const exited = { ...game, dungeon: { ...game.dungeon!, phase: "exited" as const } };
  const result = ok(exited, { type: "summarizeDungeonQuest" });
  expect(result.dungeon!.questSummary).toMatchObject({
    questId: "quest:p011",
    xpPerHero: 3,
    stagecoachXp: 3,
    awarded: false,
  });
  expect(result.dungeon!.questSummary!.clearedRoomIds.sort()).toEqual([...ids].sort());
});
it("普通任务Torch不清理暗房，非法dark清理仍不能计XP", () => {
  const game = ok(ok(fixture("quest:p001"), resolve), torch());
  const d = game.dungeon!;
  expect(d.rooms.find((r) => r.id === d.position)!.cleared).not.toBe(true);
  const bad = {
    ...d,
    rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)),
  };
  expect(readDungeonQuestProgress(bad).status).toBe("refused");
});
it("光照效果拒绝时Torch与暗房清理原子回滚；待选不消耗Torch", () => {
  const base = ok(fixture(), resolve),
    d = base.dungeon!;
  for (const patch of [
    { explorationSetup: { ...d.explorationSetup!, light: 6 } },
    { pending: { id: "pending", prompt: "pending", options: [] } },
  ]) {
    const bad = { ...base, dungeon: { ...d, ...patch } },
      snapshot = structuredClone(bad);
    expect(applyCommand(bad, torch()).state).toBe(bad);
    expect(bad).toEqual(snapshot);
  }
});
