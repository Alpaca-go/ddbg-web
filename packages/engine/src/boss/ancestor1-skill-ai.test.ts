import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import {
  finalPreparationFixture,
  withoutSupportReflection,
} from "../test-helpers/final-preparation";
import { readFinalFormSequence } from "./final-form-sequence";
import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import {
  ancestor1SkillAiShouldReplacePrepare,
  applyAncestor1SkillFromStanceSelection,
} from "./ancestor1-skill-ai";

function prepared(questId: "quest:p016" | "quest:p017" = "quest:p016") {
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

function ancestor1Fighting(): GameState {
  const game = applyCommand(prepared(), { type: "startBattle" }).state;
  expect(readFinalFormSequence(game)!.current!.id).toBe("ancestor1");
  return game;
}

function ancestor(game: GameState) {
  return game.battle!.entities.find(
    (entity) => entity.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID,
  )!;
}

function onAncestorTurn(state: GameState): GameState {
  const actor = ancestor(state);
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

function withRoll(state: GameState, roll: number): GameState {
  let cursor = 0;
  while (nextBattleRoll(state.seed, cursor) !== roll) cursor += 1;
  return { ...state, battle: { ...state.battle!, rngCursor: cursor } };
}

function prepare(state: GameState) {
  return applyCommand(state, {
    type: "prepareMonsterAction",
    actorId: ancestor(state).id,
  });
}

it("姿态未满：按 d10 选 Perfect Replication，召唤到空姿态并扣 Torch", () => {
  const game = withRoll(onAncestorTurn(withoutSupportReflection(ancestor1Fighting())), 1);
  const lightBefore = game.battle!.light;
  const result = prepare(game);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Perfect Replication"),
    ),
  ).toBe(true);
  const summoned = result.state.battle!.entities.filter((entity) =>
    entity.id.startsWith("ancestor1-perfect-replication:"),
  );
  expect(summoned).toHaveLength(1);
  expect(summoned.some((entity) => entity.areaId === "J")).toBe(true);
  expect(result.state.battle!.light).toBe(lightBefore - 1);
});

it("姿态未满且骰到 4–10：走 Imperfect Reproduction", () => {
  const game = withRoll(onAncestorTurn(withoutSupportReflection(ancestor1Fighting())), 7);
  const result = prepare(game);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" && event.message.includes("Imperfect Reproduction"),
    ),
  ).toBe(true);
  expect(
    result.state.battle!.entities.some(
      (entity) => entity.monsterCardId === "monster_medium:p109" && entity.areaId === "J",
    ),
  ).toBe(true);
});

it("姿态全满：改走 Time Heals All，按 Most Wounded 治疗 10", () => {
  const first = prepare(withRoll(onAncestorTurn(ancestor1Fighting()), 1)).state;
  const wounded = {
    ...first,
    battle: {
      ...first.battle!,
      entities: first.battle!.entities.map((entity) =>
        entity.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID ? { ...entity, wounds: 20 } : entity,
      ),
    },
  } as GameState;
  const game = onAncestorTurn(wounded);
  const result = prepare(game);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Time Heals All"),
    ),
  ).toBe(true);
  expect(
    result.state.battle!.entities.find(
      (entity) => entity.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID,
    )!.wounds,
  ).toBe(10);
});

it("非 ancestor1 形态不接管", () => {
  const fighting = applyCommand(prepared("quest:p017"), { type: "startBattle" }).state;
  expect(readFinalFormSequence(fighting)!.current!.id).toBe("ancestor2");
  const actor = fighting.battle!.entities.find((entity) => entity.side === "monster")!;
  expect(ancestor1SkillAiShouldReplacePrepare(fighting, actor.id)).toBe(false);
  expect(
    applyAncestor1SkillFromStanceSelection(fighting, actor.id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});
