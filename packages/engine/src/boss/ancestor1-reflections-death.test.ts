import { expect, it } from "vitest";
import { applyCommand, type ApplyResult, type GameState } from "../command";
import { removeCasualties } from "../encounter";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";

const IMPERFECT = "monster_medium:p109";
const PERFECT = "monster_medium:p106";
const ANCESTOR = "monster_medium:p105";

function ancestor1Deployed(): GameState {
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
  return applyCommand(applyCommand(ready, { type: "prepareFinalBattleForms" }).state, {
    type: "deployFinalBattleForm",
  }).state;
}

function ancestor1Fighting(): GameState {
  const deployed = ancestor1Deployed();
  const started = applyCommand(deployed, { type: "startBattle" });
  expect(started.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  return started.state;
}

function killEntity(state: GameState, cardId: string): ApplyResult {
  const target = state.battle!.entities.find((entity) => entity.monsterCardId === cardId)!;
  const next: GameState = {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entity) =>
        entity.id === target.id ? { ...entity, wounds: entity.life!, dead: true } : entity,
      ),
    },
  };
  return removeCasualties({ state: next, events: [] }, [target.id]);
}

function ancestor(state: GameState) {
  return state.battle!.entities.find((entity) => entity.monsterCardId === ANCESTOR)!;
}

it("ancestor1 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(ancestor1Deployed())!;
  expect(sequence.current!.id).toBe("ancestor1");
  expect(sequence.current!.combatReady).toBe(false);
});

it("Imperfect Reflection 死亡 → 存活 Ancestor +10 伤口", () => {
  const before = ancestor1Fighting();
  const woundsBefore = ancestor(before).wounds;
  const result = killEntity(before, IMPERFECT);
  expect(ancestor(result.state).wounds).toBe(woundsBefore + 10);
  expect(
    result.events.some((event) => event.type === "dungeonUpdated" && event.message.includes("10")),
  ).toBe(true);
});

it("Perfect Reflection 死亡不反噬 Ancestor", () => {
  const before = ancestor1Fighting();
  const woundsBefore = ancestor(before).wounds;
  const result = killEntity(before, PERFECT);
  expect(ancestor(result.state).wounds).toBe(woundsBefore);
});

it("Ancestor 已死亡时 Imperfect 死亡不反噬", () => {
  const before = ancestor1Fighting();
  const ancestorEntity = ancestor(before);
  const withDeadAncestor: GameState = {
    ...before,
    battle: {
      ...before.battle!,
      entities: before.battle!.entities.map((entity) =>
        entity.id === ancestorEntity.id ? { ...entity, wounds: entity.life!, dead: true } : entity,
      ),
    },
  };
  const imperfect = withDeadAncestor.battle!.entities.find(
    (entity) => entity.monsterCardId === IMPERFECT,
  )!;
  const result = removeCasualties(
    {
      state: {
        ...withDeadAncestor,
        battle: {
          ...withDeadAncestor.battle!,
          entities: withDeadAncestor.battle!.entities.map((entity) =>
            entity.id === imperfect.id ? { ...entity, wounds: entity.life!, dead: true } : entity,
          ),
        },
      },
      events: [],
    },
    [imperfect.id],
  );
  const deadAncestor = result.state.battle!.entities.find(
    (entity) => entity.monsterCardId === ANCESTOR,
  )!;
  expect(deadAncestor.wounds).toBe(ancestorEntity.life);
  expect(deadAncestor.dead).toBe(true);
});

it("非 ancestor1 最终战形态不触发", () => {
  let game = ancestor1Fighting();
  const sequence = readFinalFormSequence(game)!;
  game = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      finalFormSequence: {
        completedForms: ["ancestor1"],
        status: "fighting",
      },
    },
    battle: {
      ...game.battle!,
      entities: [
        ...game.battle!.entities.filter((entity) => entity.side === "hero"),
        {
          ...game.battle!.entities.find((entity) => entity.monsterCardId === IMPERFECT)!,
          monsterCardId: IMPERFECT,
          wounds: 0,
          dead: false,
        },
      ],
    },
  };
  void sequence;
  const imperfect = game.battle!.entities.find((entity) => entity.monsterCardId === IMPERFECT)!;
  const result = removeCasualties(
    {
      state: {
        ...game,
        battle: {
          ...game.battle!,
          entities: game.battle!.entities.map((entity) =>
            entity.id === imperfect.id ? { ...entity, wounds: entity.life!, dead: true } : entity,
          ),
        },
      },
      events: [],
    },
    [imperfect.id],
  );
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Reflections"),
    ),
  ).toBe(false);
});
