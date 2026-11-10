import { expect, it } from "vitest";
import { applyCommand, type Command, type GameEvent, type GameState } from "../command";
import { endgameFinalBattleReady } from "../test-helpers/endgame-party";
import { playNaturalBattle } from "../test-helpers/natural-battle";
import { readFinalFormSequence } from "./final-form-sequence";

function playToCampaignEnd(): {
  readonly state: GameState;
  readonly commands: readonly Command[];
  readonly events: readonly GameEvent[];
  readonly forms: readonly string[];
} {
  const commands: Command[] = [];
  const events: GameEvent[] = [];
  let state = applyCommand(endgameFinalBattleReady(), { type: "deployFinalBattleForm" }).state;
  const step = (command: Command) => {
    const result = applyCommand(state, command);
    const refused = result.events.find((event) => event.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    commands.push(command);
    events.push(...result.events);
    state = result.state;
  };
  const settle = () => {
    for (let guard = 0; guard < 200; guard++) {
      while (state.dungeon?.deathTrinketChoice)
        step({
          type: "resolveChoice",
          choiceId: state.dungeon.deathTrinketChoice.id,
          optionId: "discard",
        });
      const pending = state.battle?.pending?.choice ?? state.dungeon?.pending;
      if (!pending) return;
      step({ type: "resolveChoice", choiceId: pending.id, optionId: pending.options[0]!.id });
    }
    throw new Error("choice loop");
  };
  const forms: string[] = [];
  for (let form = 0; form < 4; form++) {
    forms.push(readFinalFormSequence(state)!.current!.id);
    try {
      playNaturalBattle({ state: () => state, step, settle });
    } catch (error) {
      const turn = state.battle?.encounter?.turn;
      if (
        !(error instanceof Error) ||
        error.message !== "battle halted: heroesDefeated" ||
        turn?.type !== "halted" ||
        turn.reason !== "heroesDefeated"
      )
        throw error;
      step({ type: "finishDungeonBattle" });
      break;
    }
    if (state.dungeon!.campaignVictory) break;
    step({ type: "deployFinalBattleForm" });
  }
  return { state, commands, events, forms };
}

it("III 级队伍固定指令结算到合法终点，胜负由战斗决定（R-190）", () => {
  const run = playToCampaignEnd();
  if (run.state.dungeon?.campaignFailure) {
    expect(run.state.dungeon.campaignFailure).toBe("bossQuestHeroesDefeated");
    expect(run.state.battle!.encounter!.turn).toMatchObject({
      type: "halted",
      reason: "heroesDefeated",
    });
    expect(run.state.dungeon.finalFormSequence!.completedForms).toEqual(run.forms.slice(0, -1));
    return;
  }
  expect(run.forms).toEqual(["ancestor1", "gestatingHeart", "heartOfDarkness"]);
  expect(run.state.dungeon!.campaignVictory).toBe(true);
  expect(run.state.dungeon!.finalFormSequence).toEqual({
    completedForms: ["ancestor1", "gestatingHeart", "heartOfDarkness"],
    status: "complete",
  });
  expect(
    run.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("战役胜利（R9、R41）"),
    ),
  ).toBe(true);
  // 终局后不再接受命令。
  const after = applyCommand(run.state, { type: "startBattle" });
  expect(after.state).toBe(run.state);
  expect(after.events.some((event) => event.type === "commandRefused")).toBe(true);
}, 180000);
