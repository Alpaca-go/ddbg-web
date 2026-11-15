import { expect, it } from "vitest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { unpreparedQuest } from "./test-helpers/unprepared-quest";

it("seed2 Patrol 自然 Ambush 战斗开始前后严格恢复，删标记拒绝（R-234）", () => {
  const { start, before, after, attack, commands, sources } = unpreparedQuest();
  expect(attack).toEqual({ type: "startBattle", wealdUnprepared: true });
  for (const [game, log] of [
    [before, commands],
    [after, [...commands, attack]],
  ] as const) {
    const save = createQuestSave(start, [...log], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const tampered = createQuestSave(start, [...commands, attack], after, sources);
  const last = tampered.commands[tampered.commands.length - 1]!;
  if (last.type !== "startBattle") throw new Error("缺战斗开始命令");
  delete last.wealdUnprepared;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);
