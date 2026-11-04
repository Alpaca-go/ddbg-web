import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { readFinalFormSequence } from "./final-form-sequence";
import { GESTATING_HEART_MONSTER_CARD_ID } from "./gestating-heart-ichor";
import {
  applyGestatingHeartDispersion,
  gestatingHeartSkillAiShouldReplacePrepare,
} from "./gestating-heart-summon";

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

function heartOfDarknessNext(state: GameState): GameState {
  const sequence = readFinalFormSequence(state)!;
  const fought = applyCommand(state, { type: "startBattle" }).state;
  const killed = {
    ...fought,
    battle: {
      ...fought.battle!,
      entities: fought.battle!.entities.map((entity) =>
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
  } as GameState;
  return applyCommand(killed, { type: "finishDungeonBattle" }).state;
}

function gestatingHeartFighting(): GameState {
  const afterAncestor1 = heartOfDarknessNext(prepared());
  const deployed = applyCommand(afterAncestor1, { type: "deployFinalBattleForm" }).state;
  const fighting = applyCommand(deployed, { type: "startBattle" }).state;
  expect(readFinalFormSequence(fighting)!.current!.id).toBe("gestatingHeart");
  return fighting;
}

function heart(game: GameState) {
  return game.battle!.entities.find(
    (entity) => entity.monsterCardId === GESTATING_HEART_MONSTER_CARD_ID,
  )!;
}

function onHeartTurn(state: GameState): GameState {
  const actor = heart(state);
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

function prepare(state: GameState) {
  return applyCommand(state, { type: "prepareMonsterAction", actorId: heart(state).id });
}

it("有空姿态位：Dispersion 自动随机召唤并结束回合", () => {
  const game = onHeartTurn(gestatingHeartFighting());
  const cursorBefore = game.battle!.rngCursor;
  const result = prepare(game);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Summon：随机召唤"),
    ),
  ).toBe(true);
  expect(
    result.state.battle!.entities.filter((entity) => entity.id.startsWith("gestating-summon:")),
  ).toHaveLength(1);
  expect(result.state.battle!.rngCursor).toBe(cursorBefore + 1);
  expect(result.state.battle!.encounter!.turn).not.toMatchObject({
    type: "monster",
    actorId: heart(game).id,
  });
});

it("姿态轨已满：本次 Dispersion 不召唤，但仍结束回合", () => {
  const base = onHeartTurn(gestatingHeartFighting());
  const actor = heart(base);
  const filler = ["B", "A", "J"].map((areaId, index) => ({
    ...actor,
    id: `filler-${index}`,
    areaId,
    stance: (["defensive", "ranged", "support"] as const)[index]!,
    stanceSlots: 1 as const,
  }));
  const full: GameState = {
    ...base,
    battle: { ...base.battle!, entities: [...base.battle!.entities, ...filler] },
  };
  const result = prepare(full);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  const message = result.events.find((event) => event.type === "dungeonUpdated");
  expect(message?.type === "dungeonUpdated" && message.message.includes("召唤未执行")).toBe(true);
  expect(
    result.state.battle!.entities.filter((entity) => entity.id.startsWith("gestating-summon:")),
  ).toHaveLength(0);
  expect(result.state.battle!.encounter!.turn).not.toMatchObject({
    type: "monster",
    actorId: actor.id,
  });
});

it("非 gestatingHeart 形态不接管", () => {
  const ancestor1 = applyCommand(prepared(), { type: "startBattle" }).state;
  expect(readFinalFormSequence(ancestor1)!.current!.id).toBe("ancestor1");
  const actor = ancestor1.battle!.entities.find((entity) => entity.side === "monster")!;
  expect(gestatingHeartSkillAiShouldReplacePrepare(ancestor1, actor.id)).toBe(false);
  expect(
    applyGestatingHeartDispersion(ancestor1, actor.id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});
