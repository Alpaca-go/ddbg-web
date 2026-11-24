import { expect, it } from "vitest";
import { monsterZeroCapacityQuest } from "../helpers/monster-zero-capacity-quest";
import { applyCommand } from "../../src/shared/core/command";
import { createQuestSave, loadQuestSave } from "../../src/shared/quest/quest-save";
it("W-03 seed3 怪物公开移动必经零容量区，完整日志恢复", () => {
  const f = monsterZeroCapacityQuest();
  const result = applyCommand(f.before, f.action);
  expect(result.state).toEqual(f.after);
  const moved = result.events.find((e) => e.type === "monsterPositioned")!;
  expect(moved.type).toBe("monsterPositioned");
  expect({
    action: f.action,
    pending: f.before.battle!.pending?.choice ?? null,
    moved,
  }).toMatchSnapshot();
  const refused = applyCommand(f.illegal, f.skill);
  expect(refused.state).toEqual(f.illegal);
  expect(refused.events).toContainEqual(
    expect.objectContaining({ type: "commandRefused", message: expect.stringContaining("W-03") }),
  );
  expect(applyCommand(f.after, f.skill).state).toEqual(f.finished);
  for (const [game, log] of [
    [f.before, f.commands],
    [f.after, [...f.commands, f.action]],
    [f.finished, [...f.commands, f.action, f.skill]],
  ] as const) {
    const save = createQuestSave(f.start, [...log], game, f.sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), f.sources).game).toEqual(game);
  }
}, 120000);
