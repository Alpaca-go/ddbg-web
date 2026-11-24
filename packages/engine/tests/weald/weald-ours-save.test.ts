import { expect, it } from "vitest";
import { applyCommand } from "../../src/shared/core/command";
import { createQuestSave, loadQuestSave } from "../../src/shared/quest/quest-save";
import { oursQuest } from "../helpers/ours-quest";
it("seed21 公开拾箱路径 Ours! 前后严格恢复，删版本拒绝（R-234／R-238）", () => {
  const {
    start,
    before,
    beforePickup,
    pickupIndex,
    pickupSteps,
    after,
    attack,
    commands,
    sources,
  } = oursQuest();
  expect(before.battle!.wealdOurs).toBe(true);
  expect(pickupSteps.map((c) => c.type)).toEqual(["interactLoot", "resolveChoice"]);
  expect(applyCommand(before, attack).state).toEqual(after);
  const resumed = pickupSteps.reduce(
    (game, command) => applyCommand(game, command).state,
    JSON.parse(JSON.stringify(beforePickup)),
  );
  expect(resumed).toEqual(after);
  for (const [game, log] of [
    [beforePickup, commands.slice(0, pickupIndex)],
    [before, commands],
    [after, [...commands, attack]],
  ] as const) {
    const save = createQuestSave(start, [...log], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const tampered = createQuestSave(start, [...commands, attack], after, sources);
  const last = [...tampered.commands]
    .reverse()
    .find((c) => c.type === "startBattle" && c.wealdOurs)!;
  if (last.type !== "startBattle") throw new Error("缺版本开始命令");
  delete last.wealdOurs;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);
