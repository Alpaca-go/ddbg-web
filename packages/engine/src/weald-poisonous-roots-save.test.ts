import { expect, it } from "vitest";
import { applyCommand } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { poisonousRootsQuest } from "./test-helpers/poisonous-roots-quest";
it("R-245 seed2 Poisonous Roots 公开结束回合、腐蚀及严格恢复", () => {
  const f = poisonousRootsQuest();
  const r = applyCommand(f.before, f.action);
  expect(r.state).toEqual(f.after);
  expect(r.events).toContainEqual(
    expect.objectContaining({ type: "passiveTriggered", trigger: "poisonousRoots" }),
  );
  if (f.action.type !== "changeStance") throw new Error("缺换姿态命令");
  const actorId = f.action.actorId;
  expect(f.after.battle!.entities.find((e) => e.id === actorId)!.statusStacks).toContainEqual(
    expect.objectContaining({ kind: "blight", amount: 2, remaining: 2 }),
  );
  for (const [game, log] of [
    [f.before, f.commands],
    [f.after, [...f.commands, f.action]],
  ] as const) {
    const save = createQuestSave(f.start, [...log], game, f.sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), f.sources).game).toEqual(game);
  }
}, 120000);
