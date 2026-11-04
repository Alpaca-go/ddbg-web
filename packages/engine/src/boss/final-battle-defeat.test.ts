import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { readFinalFormSequence } from "./final-form-sequence";

function firstFormFighting(): GameState {
  const base = finalPreparationFixture("quest:p016");
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const ready: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: { ...begun.dungeon!.hamlet!, phase: "preparationComplete", remainingDays: 0, day: 4 },
    },
  };
  const prepared = applyCommand(applyCommand(ready, { type: "prepareFinalBattleForms" }).state, {
    type: "deployFinalBattleForm",
  }).state;
  return applyCommand(prepared, { type: "startBattle" }).state;
}

it("最终战英雄全灭 = 战役失败（R-044），不是形态推进", () => {
  const fighting = firstFormFighting();
  expect(readFinalFormSequence(fighting)!.current!.id).toBe("ancestor1");
  const wipe: GameState = {
    ...fighting,
    battle: {
      ...fighting.battle!,
      entities: fighting.battle!.entities.map((entity) =>
        entity.side === "hero" ? { ...entity, dead: true, wounds: entity.life! } : entity,
      ),
      encounter: {
        round: 4,
        deck: [],
        actedIds: [],
        turn: { type: "halted", reason: "heroesDefeated", monstersDefeated: false },
      },
    },
  };
  const result = applyCommand(wipe, { type: "finishDungeonBattle" });
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.campaignFailure).toBe("bossQuestHeroesDefeated");
  expect(result.state.dungeon!.finalFormSequence).toEqual({
    completedForms: [],
    status: "fighting",
  });
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("战役失败（R-044）"),
    ),
  ).toBe(true);

  // 终局后不再接受部署 / 战斗 / 结算命令。
  for (const command of [
    { type: "startBattle" },
    { type: "deployFinalBattleForm" },
    { type: "finishDungeonBattle" },
  ] as const) {
    const after = applyCommand(result.state, command);
    expect(after.state).toBe(result.state);
    expect(after.events.some((event) => event.type === "commandRefused")).toBe(true);
  }
});
