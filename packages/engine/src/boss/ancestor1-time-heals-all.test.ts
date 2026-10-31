import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import {
  ANCESTOR_1_MONSTER_CARD_ID,
  applyAncestor1TimeHealsAll,
  TIME_HEALS_ALL_HEAL_AMOUNT,
} from "./ancestor1-time-heals-all";
import { removeCasualties } from "../encounter";
import type { ApplyResult } from "../command";

const PERFECT = "monster_medium:p106";
const IMPERFECT = "monster_medium:p109";

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

function ancestor(state: GameState) {
  return state.battle!.entities.find(
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
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

function fillSupportStance(state: GameState): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: [
        ...state.battle!.entities,
        {
          id: "fill-support",
          side: "monster",
          hero: null,
          monsterCardId: "monster_medium:p072",
          life: 26,
          dodge: 3,
          areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.support,
          stance: "support",
          stanceSlots: 1,
          wounds: 0,
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        },
      ],
    },
  };
}

function withWounds(state: GameState, cardId: string, wounds: number): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entity) =>
        entity.monsterCardId === cardId ? { ...entity, wounds } : entity,
      ),
    },
  };
}

it("ancestor1 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(ancestor1Deployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("满槽时对 Most Wounded 友方治疗 10 并 finishTurn", () => {
  let game = onAncestorTurn(fillSupportStance(ancestor1Fighting()));
  game = withWounds(withWounds(game, PERFECT, 12), IMPERFECT, 5);
  const perfectBefore = game.battle!.entities.find((entity) => entity.monsterCardId === PERFECT)!;
  const result = applyAncestor1TimeHealsAll(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const perfectAfter = result.state.battle!.entities.find(
    (entity) => entity.monsterCardId === PERFECT,
  )!;
  expect(perfectAfter.wounds).toBe(perfectBefore.wounds - TIME_HEALS_ALL_HEAL_AMOUNT);
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
});

it("怪物姿态轨有空槽则拒绝", () => {
  const game = onAncestorTurn(ancestor1Fighting());
  const result = applyAncestor1TimeHealsAll(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  expect(result.events.find((event) => event.type === "commandRefused")?.message).toContain(
    "姿态轨须全部占用",
  );
});

it("非 ancestor1 形态或非 Ancestor 回合拒绝", () => {
  const onTurn = onAncestorTurn(fillSupportStance(ancestor1Fighting()));
  const wrongForm: GameState = {
    ...onTurn,
    dungeon: {
      ...onTurn.dungeon!,
      finalFormSequence: {
        completedForms: ["ancestor1"],
        status: "fighting",
      },
    },
  };
  expect(
    applyAncestor1TimeHealsAll(wrongForm, ancestor(wrongForm).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);

  const heroTurn: GameState = {
    ...onTurn,
    battle: {
      ...onTurn.battle!,
      encounter: {
        ...onTurn.battle!.encounter!,
        turn: {
          type: "hero",
          actorId: onTurn.battle!.entities.find((e) => e.side === "hero")!.id,
          actions: 2,
          usedSkillIds: [],
        },
      },
    },
  };
  expect(
    applyAncestor1TimeHealsAll(heroTurn, ancestor(heroTurn).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});

function killImperfectReflection(state: GameState): ApplyResult {
  const target = state.battle!.entities.find((entity) => entity.monsterCardId === IMPERFECT)!;
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

it("回归 Reflections Imperfect 死亡反噬", () => {
  const before = ancestor1Fighting();
  const result = killImperfectReflection(before);
  expect(ancestor(result.state).wounds).toBeGreaterThan(ancestor(before).wounds);
});
