import { expect, it } from "vitest";
import { applyCommand } from "../../src/command";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
import { fungusHealingQuest } from "../../src/test-helpers/fungus-healing-quest";
it("W-04 seed1 活真菌阻止治疗，完整日志恢复后仍原子拒绝", () => {
  const f = fungusHealingQuest();
  const save = createQuestSave(f.start, f.commands, f.before, f.sources);
  const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), f.sources).game;
  expect(restored).toEqual(f.before);
  const r = applyCommand(restored, f.heal);
  expect(r.events).toContainEqual(
    expect.objectContaining({ type: "commandRefused", message: expect.stringContaining("W-04") }),
  );
  expect(r.state).toEqual(restored);
}, 120000);
