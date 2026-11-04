import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { readFinalFormSequence } from "./final-form-sequence";

function prepared(questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p016") {
  const base = finalPreparationFixture(questId);
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const state: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: { ...begun.dungeon!.hamlet!, phase: "preparationComplete", remainingDays: 0, day: 4 },
    },
  };
  return applyCommand(applyCommand(state, { type: "prepareFinalBattleForms" }).state, {
    type: "deployFinalBattleForm",
  }).state;
}

function killCurrentForm(game: GameState): GameState {
  const sequence = readFinalFormSequence(game)!;
  return {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((entity) =>
        entity.monsterCardId === sequence.current!.actor.cardId
          ? { ...entity, dead: true }
          : entity,
      ),
      encounter: {
        round: 4,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
}

/** 打一场真实 `startBattle` 后把当前形态判死，再走正式 `finishDungeonBattle`。 */
function defeatCurrentForm(state: GameState): GameState {
  const fought = applyCommand(state, { type: "startBattle" }).state;
  const finished = applyCommand(killCurrentForm(fought), { type: "finishDungeonBattle" });
  expect(finished.events.some((event) => event.type === "commandRefused")).toBe(false);
  return finished.state;
}

function heartOfDarknessFighting(): GameState {
  let game = prepared("quest:p016");
  game = applyCommand(defeatCurrentForm(game), { type: "deployFinalBattleForm" }).state;
  game = applyCommand(defeatCurrentForm(game), { type: "deployFinalBattleForm" }).state;
  expect(readFinalFormSequence(game)!.current!.id).toBe("heartOfDarkness");
  return game;
}

function victory(): GameState {
  return defeatCurrentForm(heartOfDarknessFighting());
}

it("前三形态胜利只推进形态，不置战役胜利", () => {
  const first = defeatCurrentForm(prepared("quest:p016"));
  expect(first.dungeon!.campaignVictory).toBeUndefined();
  expect(first.dungeon!.finalFormSequence!.status).toBe("awaitingDeployment");
  const second = defeatCurrentForm(applyCommand(first, { type: "deployFinalBattleForm" }).state);
  expect(second.dungeon!.campaignVictory).toBeUndefined();
  expect(second.dungeon!.finalFormSequence!.completedForms).toHaveLength(2);
});

it("第四形态 Heart of Darkness 被击败 → campaignVictory 与 complete，事件写明战役胜利", () => {
  const game = victory();
  expect(game.dungeon!.campaignVictory).toBe(true);
  expect(game.dungeon!.finalFormSequence).toEqual({
    completedForms: ["ancestor1", "gestatingHeart", "heartOfDarkness"],
    status: "complete",
  });
  expect(readFinalFormSequence(game)!.progress.status).toBe("complete");
  expect(game.battle!.encounter!.turn).toMatchObject({ type: "finished", outcome: "victory" });
});

it("终局不接受任何进一步命令，且不改写胜利状态", () => {
  const game = victory();
  const commands = [
    { type: "finishDungeonBattle" },
    { type: "startBattle" },
    { type: "deployFinalBattleForm" },
    { type: "summarizeDungeonQuest" },
    { type: "drawHamletEvent" },
    { type: "beginReturnToHamlet" },
  ] as const;
  for (const command of commands) {
    const result = applyCommand(game, command);
    expect(result.state).toBe(game);
    const refused = result.events.find((event) => event.type === "commandRefused");
    expect(refused, command.type).toBeDefined();
    if (refused?.type === "commandRefused")
      expect(refused.message).toContain("战役已胜利（R9、R41）");
  }
  expect(game.dungeon!.campaignVictory).toBe(true);
});
