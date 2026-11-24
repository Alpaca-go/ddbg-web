import { expect, it } from "vitest";
import { applyCommand } from "../../src/command";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
import { clearingQuest } from "../../src/test-helpers/clearing-quest";
it("seed21 Clearing 移箱回池 前后严格恢复，删版本拒绝（R-234／R-238）", () => {
  const { start, before, after, attack, commands, sources } = clearingQuest();
  expect(before.battle!.wealdClearingMonsters).toBe(true);
  const result = applyCommand(before, attack);
  expect(result.state).toEqual(after);
  expect(result.events.some((e) => e.type === "passiveTriggered" && e.trigger === "clearing")).toBe(
    true,
  );
  expect(after.battle!.loot!.placed.length).toBe(before.battle!.loot!.placed.length - 1);
  expect(after.battle!.loot!.available.length).toBe(before.battle!.loot!.available.length + 1);
  expect(after.battle!.loot!.claimedIds).toEqual(before.battle!.loot!.claimedIds);
  for (const [game, log] of [
    [before, commands],
    [after, [...commands, attack]],
  ] as const) {
    const save = createQuestSave(start, [...log], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const tampered = createQuestSave(start, [...commands, attack], after, sources);
  const last = [...tampered.commands]
    .reverse()
    .find((c) => c.type === "startBattle" && c.wealdClearingMonsters)!;
  if (last.type !== "startBattle") throw new Error("缺版本开始命令");
  delete last.wealdClearingMonsters;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);

it("seed21 Clearing 英雄结束回合完整日志恢复，删除英雄版本拒绝（R-238）", () => {
  const { start, before, after, attack, commands, sources } = clearingQuest("hero");
  const result = applyCommand(before, attack);
  expect(result.state).toEqual(after);
  expect(
    result.events.some((e) => e.type === "areaStressResolved" && e.message.startsWith("Clearing")),
  ).toBe(true);
  for (const [game, log] of [
    [before, commands],
    [after, [...commands, attack]],
  ] as const) {
    const save = createQuestSave(start, [...log], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const save = createQuestSave(start, [...commands, attack], after, sources);
  const last = [...save.commands]
    .reverse()
    .find((c) => c.type === "startBattle" && c.wealdClearingHeroes)!;
  if (last.type !== "startBattle") throw new Error("缺英雄版本");
  delete last.wealdClearingHeroes;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(save)), sources)).toThrow(/不一致/);
}, 120000);
