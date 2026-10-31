import { expect, it } from "vitest";
import { applyCommand, type GameState, type Command } from "./command";
import { finalPreparationFixture } from "./test-helpers/final-preparation";
import { questSaveSchema } from "../../data/src/quest-save";
import { currentHamletEvent } from "./hamlet-event";

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
it.each(["quest:p016", "quest:p017", "quest:p018"] as const)(
  "%s 最后村庄四天，不抽牌也不消费RNG；按公开行动走完",
  (id) => {
    const before = finalPreparationFixture(id),
      snapshot = structuredClone(before);
    let game = ok(before, { type: "beginFinalPreparation" });
    expect(before).toEqual(snapshot);
    expect(game.dungeon!.cursor).toBe(before.dungeon!.cursor);
    expect(game.dungeon!.hamletMemory).toEqual(before.dungeon!.hamletMemory);
    expect(currentHamletEvent(game)).toBeUndefined();
    expect(game.dungeon!.hamlet).toMatchObject({
      preparationDays: 4,
      remainingDays: 4,
      finalPreparation: true,
      active: null,
    });
    expect(applyCommand(game, { type: "beginFinalPreparation" }).state).toBe(game);
    expect(applyCommand(before, { type: "drawHamletEvent" }).state).toBe(before);
    for (let day = 1; day <= 4; day++) {
      expect(game.dungeon!.hamlet!.day).toBe(day);
      game = ok(game, { type: "rollHamletCaretaker" });
      const actorId = game.dungeon!.hamlet!.heroOrder[0]!;
      game = ok(game, { type: "useHamletSkill", actorId, skill: "zealousSpeech" });
      expect(game).toEqual(JSON.parse(JSON.stringify(game)));
    }
    expect(game.dungeon!.hamlet).toMatchObject({
      phase: "preparationComplete",
      remainingDays: 0,
      day: 4,
    });
    expect(applyCommand(game, { type: "offerNextQuest" }).state).toBe(game);
    expect(applyCommand(game, { type: "rollHamletCaretaker" }).state).toBe(game);
    expect(game.dungeon!.hamletMemory).toEqual(before.dungeon!.hamletMemory);
  },
);
it("未胜利、未发XP、待选、未回村和非最暗身份拒绝", () => {
  const base = finalPreparationFixture();
  for (const patch of [
    { questSummary: { ...base.dungeon!.questSummary!, awarded: false } },
    { phase: "exited" as const },
    { pending: { id: "x", prompt: "x", options: [] } },
  ]) {
    const state = { ...base, dungeon: { ...base.dungeon!, ...patch } };
    expect(applyCommand(state, { type: "beginFinalPreparation" }).state).toBe(state);
  }
  for (const key of ["bossQuestVictory", "darkest"] as const) {
    const state = structuredClone(base);
    delete state.dungeon![key];
    expect(applyCommand(state, { type: "beginFinalPreparation" }).state).toBe(state);
  }
  // 命令正式入存档白名单；不声称机制夹具有自然最暗胜利日志。
  expect(
    questSaveSchema.shape.commands.safeParse([{ type: "beginFinalPreparation" }]).success,
  ).toBe(true);
});
