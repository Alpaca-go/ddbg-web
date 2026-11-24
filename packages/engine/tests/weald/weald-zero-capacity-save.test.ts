import { expect, it } from "vitest";
import { applyCommand } from "../../src/command";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
import { zeroCapacityQuest } from "../../src/test-helpers/zero-capacity-quest";
it("W-03 seed2 零容量暂留、穿过与移出均可严格恢复，最后行动原地移动拒绝", () => {
  const f = zeroCapacityQuest();
  const turn = f.paused.battle!.encounter!.turn;
  expect(turn).toMatchObject({ type: "hero", actions: 1, mustMove: true });
  if (turn.type !== "hero") throw new Error("缺英雄回合");
  const refused = applyCommand(f.paused, { type: "moveHero", actorId: turn.actorId, path: [] });
  expect(refused.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(refused.state).toEqual(f.paused);
  for (const [game, commands] of [
    [f.before, f.commands],
    [f.paused, [...f.commands, f.enter]],
    [f.after, [...f.commands, f.enter, f.leave]],
    [f.crossed, [...f.commands, f.through]],
  ] as const) {
    const save = createQuestSave(f.start, [...commands], game, f.sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), f.sources).game).toEqual(game);
  }
}, 120000);
