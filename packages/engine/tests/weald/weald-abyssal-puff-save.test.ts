import { expect, it } from "vitest";
import { applyCommand } from "../../src/command";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
import { abyssalPuffQuest } from "../../src/test-helpers/abyssal-puff-quest";
it("seed1 Fungal Research 摧毁前后严格恢复，删版本拒绝（R-234／R-236）", () => {
  const { start, before, after, attack, uiAttack, commands, sources } = abyssalPuffQuest();
  expect(before.battle!.wealdAbyssalPuff).toBe(true);
  expect(applyCommand(before, attack).state).toEqual(after);
  expect(applyCommand(before, uiAttack).state).toEqual(after);
  const uiSave = createQuestSave(start, [...commands, uiAttack], after, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(uiSave)), sources).game).toEqual(after);
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
    .find((c) => c.type === "startBattle" && c.wealdAbyssalPuff)!;
  if (last.type !== "startBattle") throw new Error("缺版本开始命令");
  delete last.wealdAbyssalPuff;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);
