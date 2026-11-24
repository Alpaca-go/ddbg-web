import { expect, it } from "vitest";
import { applyCommand } from "../../src/shared/core/command";
import { createQuestSave, loadQuestSave } from "../../src/shared/quest/quest-save";
import { preciousQuest } from "../helpers/precious-quest";
it("seed22 定向玩家路径 Precious 前后严格恢复，删版本拒绝（R-234／R-237）", () => {
  const { start, before, after, attack, commands, sources } = preciousQuest();
  expect(before.battle!.wealdPrecious).toBe(true);
  expect(applyCommand(before, attack).state).toEqual(after);
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
    .find((c) => c.type === "startBattle" && c.wealdPrecious)!;
  if (last.type !== "startBattle") throw new Error("缺版本开始命令");
  delete last.wealdPrecious;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);
