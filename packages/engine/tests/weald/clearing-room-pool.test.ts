import { applyCommand } from "../../src/shared/core/command";
import { expect, it } from "vitest";
import { clearingQuest } from "../helpers/clearing-quest";
import { createQuestSave, loadQuestSave } from "../../src/shared/quest/quest-save";
import { createLootState } from "../../src/shared/trinkets/loot";

it("R-260 Clearing 回池后自然结束战斗、下一房部署及严格恢复", () => {
  const f = clearingQuest("next-room");
  expect(f.returned).toBeDefined();
  expect(f.transferred).toBeDefined();
  for (const [game, log] of [
    [f.transferred!, f.commands.slice(0, f.transferredIndex)],
    [f.after, [...f.commands, f.attack]],
  ] as const) {
    const save = createQuestSave(f.start, [...log], game, f.sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), f.sources).game).toEqual(game);
  }
  const old = f.beforeReturn!.battle!.loot!;
  const returned = f.returned!.battle!.loot!;
  const removed = old.placed.filter((t) => !returned.placed.some((r) => r.id === t.id));
  expect(removed).toHaveLength(1);
  const { id, kind } = removed[0]!;
  expect(returned.available).toContainEqual({ id, kind });
  expect(returned.claimedIds).toEqual(old.claimedIds);
  const pool = f.transferred!.dungeon!.lootPool!;
  expect(pool.available).toContainEqual({ id, kind });
  expect(pool.claimedIds).not.toContain(id);
  expect(pool.available).toEqual(f.beforeTransfer!.battle!.loot!.available);
  expect(pool.claimedIds).toEqual(f.beforeTransfer!.battle!.loot!.claimedIds);
  expect(f.after.dungeon!.position).not.toBe(f.returned!.dungeon!.position);
  const saved = createQuestSave(
    f.start,
    f.commands.slice(0, f.transferredIndex),
    f.transferred!,
    f.sources,
  );
  const restored = loadQuestSave(JSON.parse(JSON.stringify(saved)), f.sources).game;
  const resumed = [...f.commands.slice(f.transferredIndex), f.attack].reduce((game, command) => {
    const result = applyCommand(game, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    return result.state;
  }, restored);
  expect(resumed).toEqual(f.after);
  expect(pool.placed).toEqual([]);
  const next = f.after.battle!.loot!;
  const ids = [...next.available, ...next.placed].map((t) => t.id).concat([...next.claimedIds]);
  expect([...ids].sort()).toEqual(
    createLootState()
      .available.map((t) => t.id)
      .sort(),
  );
  expect(next.claimedIds).toEqual(pool.claimedIds);
  // 固定路径的下一房没有抽中该枚；仍在可用池，不能误称已再次上板。
  expect(next.available).toContainEqual({ id, kind });
  expect([...next.available, ...next.placed].filter((t) => t.id === id)).toHaveLength(1);
}, 120000);
