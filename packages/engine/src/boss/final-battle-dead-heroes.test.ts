import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { readFinalFormSequence } from "./final-form-sequence";

function formsPrepared(questId: "quest:p016" = "quest:p016"): GameState {
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

function firstFormBattle(): GameState {
  const game = applyCommand(formsPrepared(), { type: "startBattle" }).state;
  expect(readFinalFormSequence(game)!.current!.id).toBe("ancestor1");
  return game;
}

it("形态间一名英雄阵亡仍可部署下一形态，阵亡者不补人且伤口保留", () => {
  const started = firstFormBattle();
  const bossCardId = readFinalFormSequence(started)!.current!.actor.cardId;
  const hero = started.battle!.entities.find((entity) => entity.side === "hero")!;
  const survivor = started.battle!.entities.find(
    (entity) => entity.side === "hero" && entity.id !== hero.id,
  )!;
  const fought: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      entities: started.battle!.entities.map((entity) => {
        if (entity.monsterCardId === bossCardId) return { ...entity, dead: true };
        if (entity.id === hero.id) return { ...entity, dead: true, wounds: entity.life! };
        if (entity.id === survivor.id) return { ...entity, wounds: 3 };
        return entity;
      }),
      encounter: {
        round: 4,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
  const finished = applyCommand(fought, { type: "finishDungeonBattle" });
  expect(finished.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(finished.state.dungeon!.finalFormSequence!.completedForms).toEqual(["ancestor1"]);

  const next = applyCommand(finished.state, { type: "deployFinalBattleForm" });
  expect(next.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(readFinalFormSequence(next.state)!.current!.id).toBe("gestatingHeart");
  const heroes = next.state.battle!.entities.filter((entity) => entity.side === "hero");
  expect(heroes).toHaveLength(4);
  expect(heroes.find((entity) => entity.id === hero.id)!.dead).toBe(true);
  expect(heroes.find((entity) => entity.id === survivor.id)!.wounds).toBe(3);

  // 阵亡实体留在场上也能正常开战（不为其发先攻/行动）。
  const startedNext = applyCommand(next.state, { type: "startBattle" });
  expect(startedNext.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(startedNext.state.battle!.encounter!.turn).toEqual({ type: "awaitingInitiative" });
});

it("首形态部署仍拒绝已阵亡的地牢英雄", () => {
  const base = finalPreparationFixture("quest:p016");
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const prepared: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: { ...begun.dungeon!.hamlet!, phase: "preparationComplete", remainingDays: 0, day: 4 },
      heroes: begun.dungeon!.heroes.map((hero, index) =>
        index === 0 ? { ...hero, dead: true } : hero,
      ),
    },
  };
  const awaiting = applyCommand(prepared, { type: "prepareFinalBattleForms" }).state;
  const result = applyCommand(awaiting, { type: "deployFinalBattleForm" });
  expect(result.state).toBe(awaiting);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
});
