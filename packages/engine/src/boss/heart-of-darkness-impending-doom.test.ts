import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finishTurn } from "../encounter";
import { nextBattleRoll } from "../battle-roll";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import {
  applyHeartOfDarknessImpendingDoomRoll,
  HEART_OF_DARKNESS_MONSTER_CARD_ID,
} from "./heart-of-darkness-impending-doom";
import { GESTATING_HEART_MONSTER_CARD_ID } from "./gestating-heart-ichor";

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

function killCurrentBoss(game: GameState): GameState {
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

function advanceFinalForm(game: GameState): GameState {
  const fought = applyCommand(game, { type: "startBattle" }).state;
  const finished = applyCommand(killCurrentBoss(fought), { type: "finishDungeonBattle" }).state;
  return applyCommand(finished, { type: "deployFinalBattleForm" }).state;
}

function heartOfDarknessDeployed(): GameState {
  let game = prepared("quest:p016");
  game = advanceFinalForm(game);
  game = advanceFinalForm(game);
  return game;
}

function heartOfDarknessFighting(): GameState {
  const deployed = heartOfDarknessDeployed();
  const sequence = readFinalFormSequence(deployed)!;
  expect(sequence.current!.id).toBe("heartOfDarkness");
  expect(sequence.current!.combatReady).toBe(false);
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function heartEntity(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === HEART_OF_DARKNESS_MONSTER_CARD_ID,
  )!;
}

function onHeartTurn(state: GameState): GameState {
  const actor = heartEntity(state);
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

it("heartOfDarkness 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(heartOfDarknessDeployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("startBattle 写入 impendingDoomDie 并消费 rngCursor", () => {
  const deployed = heartOfDarknessDeployed();
  const cursorBefore = deployed.battle!.rngCursor;
  const expectedDie = nextBattleRoll(deployed.seed, cursorBefore);
  const started = applyCommand(deployed, { type: "startBattle" }).state;
  expect(started.battle!.impendingDoomDie).toBe(expectedDie);
  expect(started.battle!.rngCursor).toBeGreaterThan(cursorBefore + 1);
  expect(started.battle!.impendingDoomDie).toBeGreaterThanOrEqual(1);
  expect(started.battle!.impendingDoomDie).toBeLessThanOrEqual(10);
});

it("Heart finishTurn 后覆盖 impendingDoomDie", () => {
  const fighting = heartOfDarknessFighting();
  const cursorAfterStart = fighting.battle!.rngCursor;
  const onTurn = onHeartTurn(fighting);
  const finished = finishTurn(onTurn, heartEntity(onTurn).id, []);
  expect(finished.events.some((event) => event.type === "commandRefused")).toBe(false);
  const expectedDie = nextBattleRoll(fighting.seed, cursorAfterStart);
  expect(finished.state.battle!.impendingDoomDie).toBe(expectedDie);
  expect(finished.state.battle!.rngCursor).toBe(cursorAfterStart + 1);
});

it("显式 applyHeartOfDarknessImpendingDoomRoll 覆盖落位", () => {
  const fighting = heartOfDarknessFighting();
  const onTurn = onHeartTurn(fighting);
  const cursor = onTurn.battle!.rngCursor;
  const result = applyHeartOfDarknessImpendingDoomRoll(onTurn, heartEntity(onTurn).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(result.state.battle!.impendingDoomDie).toBe(nextBattleRoll(fighting.seed, cursor));
  expect(result.state.battle!.rngCursor).toBe(cursor + 1);
});

it("非 heartOfDarkness 形态拒绝显式落骰", () => {
  let game = prepared("quest:p016");
  game = applyCommand(game, { type: "startBattle" }).state;
  const ancestor = game.battle!.entities.find(
    (entity) => entity.monsterCardId === "monster_medium:p105",
  )!;
  game = {
    ...game,
    battle: {
      ...game.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: ancestor.id },
      },
    },
  };
  const result = applyHeartOfDarknessImpendingDoomRoll(game, ancestor.id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  expect(result.state.battle!.impendingDoomDie).toBeUndefined();
});

it("gestatingHeart 形态 startBattle 不写 impendingDoomDie", () => {
  let game = prepared("quest:p016");
  game = advanceFinalForm(game);
  const sequence = readFinalFormSequence(game)!;
  expect(sequence.current!.id).toBe("gestatingHeart");
  const started = applyCommand(game, { type: "startBattle" }).state;
  expect(started.battle!.impendingDoomDie).toBeUndefined();
  expect(
    started.battle!.entities.some(
      (entity) => entity.monsterCardId === GESTATING_HEART_MONSTER_CARD_ID,
    ),
  ).toBe(true);
});

it("相同种子与命令序列可复现落位", () => {
  const a = heartOfDarknessFighting();
  const b = heartOfDarknessFighting();
  expect(a.battle!.impendingDoomDie).toBe(b.battle!.impendingDoomDie);
  expect(a.battle!.rngCursor).toBe(b.battle!.rngCursor);
});

it("applyCommand 路由显式落骰命令", () => {
  const onTurn = onHeartTurn(heartOfDarknessFighting());
  const routed = applyCommand(onTurn, {
    type: "applyHeartOfDarknessImpendingDoomRoll",
    actorId: heartEntity(onTurn).id,
  });
  expect(routed.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(routed.state.battle!.impendingDoomDie).toBeDefined();
});
