import { expect, it } from "vitest";
import { applyCommand, type ApplyResult, type GameState } from "../command";
import { removeCasualties } from "../encounter";
import { readFinalFormSequence } from "./final-form-sequence";
import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import {
  IMPERFECT_REFLECTION_MONSTER_CARD_ID,
  PERFECT_REFLECTION_MONSTER_CARD_ID,
} from "./ancestor1-reflections-guard";
import { finalPreparationFixture } from "../test-helpers/final-preparation";

const ANCESTOR = ANCESTOR_1_MONSTER_CARD_ID;

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

function reflectionEntities(state: GameState) {
  return state.battle!.entities.filter(
    (entity) =>
      entity.side === "monster" &&
      (entity.monsterCardId === PERFECT_REFLECTION_MONSTER_CARD_ID ||
        entity.monsterCardId === IMPERFECT_REFLECTION_MONSTER_CARD_ID),
  );
}

function ancestorEntity(state: GameState) {
  return state.battle!.entities.find((entity) => entity.monsterCardId === ANCESTOR)!;
}

it("deploy 后 Reflections 有 Guard、Ancestor 无；combatReady 仍为 false", () => {
  const game = ancestor1Deployed();
  const sequence = readFinalFormSequence(game)!;
  expect(sequence.current!.combatReady).toBe(false);
  expect(
    reflectionEntities(game).every((entity) => entity.guard && entity.statusStacks !== undefined),
  ).toBe(true);
  expect(ancestorEntity(game).guard).toBe(false);
});

it("startBattle 后 Reflections 仍保持 Guard", () => {
  const game = ancestor1Fighting();
  expect(reflectionEntities(game).every((entity) => entity.guard)).toBe(true);
});

it("Imperfect 死亡反噬仍生效且存活 Reflection 仍 Guard", () => {
  const before = ancestor1Fighting();
  const woundsBefore = ancestorEntity(before).wounds;
  const imperfect = before.battle!.entities.find(
    (entity) => entity.monsterCardId === IMPERFECT_REFLECTION_MONSTER_CARD_ID,
  )!;
  const next: GameState = {
    ...before,
    battle: {
      ...before.battle!,
      entities: before.battle!.entities.map((entity) =>
        entity.id === imperfect.id ? { ...entity, wounds: entity.life!, dead: true } : entity,
      ),
    },
  };
  const result: ApplyResult = removeCasualties({ state: next, events: [] }, [imperfect.id]);
  expect(ancestorEntity(result.state).wounds).toBe(woundsBefore + 10);
  const livingReflections = reflectionEntities(result.state).filter((entity) => !entity.dead);
  expect(livingReflections.every((entity) => entity.guard)).toBe(true);
});

it("statusProjection 清掉 guard 后 removeCasualties 链重新断言", () => {
  const before = ancestor1Fighting();
  const perfect = before.battle!.entities.find(
    (entity) => entity.monsterCardId === PERFECT_REFLECTION_MONSTER_CARD_ID,
  )!;
  const stripped: GameState = {
    ...before,
    battle: {
      ...before.battle!,
      entities: before.battle!.entities.map((entity) =>
        entity.id === perfect.id
          ? { ...entity, guard: false, statusStacks: [{ kind: "debuff", remaining: 1 }] }
          : entity,
      ),
    },
  };
  const result = removeCasualties({ state: stripped, events: [] }, []);
  const restored = result.state.battle!.entities.find((entity) => entity.id === perfect.id)!;
  expect(restored.guard).toBe(true);
  expect(restored.statusStacks).toEqual([{ kind: "debuff", remaining: 1 }]);
});
