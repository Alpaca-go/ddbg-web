import { expect, it } from "vitest";
import { applyCommand, type ApplyResult, type GameState } from "../command";
import { removeCasualties } from "../encounter";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import { ANCESTOR_1_MONSTER_CARD_ID, applyAncestor1TimeHealsAll } from "./ancestor1-time-heals-all";
import {
  IMPERFECT_REFLECTION_MONSTER_CARD_ID,
  PERFECT_REFLECTION_MONSTER_CARD_ID,
} from "./ancestor1-reflections-guard";
import { applyAncestor1PerfectReplication } from "./ancestor1-perfect-replication";
import {
  applyAncestor1ImperfectReproduction,
  IMPERFECT_REPRODUCTION_STRESS_AMOUNT,
  IMPERFECT_REPRODUCTION_SUMMON_CARD_ID,
} from "./ancestor1-imperfect-reproduction";

const IMPERFECT = IMPERFECT_REFLECTION_MONSTER_CARD_ID;
const PERFECT = PERFECT_REFLECTION_MONSTER_CARD_ID;

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

function mostStressedHero(state: GameState) {
  const heroes = state.battle!.entities.filter((entity) => entity.side === "hero" && !entity.dead);
  return [...heroes].sort((a, b) => b.stress! - a.stress! || a.id.localeCompare(b.id))[0]!;
}

it("ancestor1 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(ancestor1Deployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("空槽召唤 Imperfect Reflection、Most Stressed 压力 +2、Guard 并 finishTurn", () => {
  const fighting = ancestor1Fighting();
  const before = onAncestorTurn({
    ...fighting,
    battle: {
      ...fighting.battle!,
      entities: fighting.battle!.entities.map((entity) =>
        entity.side === "hero" && entity.hero === "vestal"
          ? { ...entity, stress: 7 }
          : entity.side === "hero"
            ? { ...entity, stress: 2 }
            : entity,
      ),
    },
  });
  const expectedTarget = mostStressedHero(before);
  const monstersBefore = before.battle!.entities.filter(
    (entity) => entity.side === "monster",
  ).length;
  const result = applyAncestor1ImperfectReproduction(before, ancestor(before).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const stressedEntity = result.state.battle!.entities.find(
    (entity) => entity.id === expectedTarget.id,
  )!;
  expect(stressedEntity.stress).toBeGreaterThanOrEqual(expectedTarget.stress! + 1);
  expect(stressedEntity.stress).toBeLessThanOrEqual(
    Math.min(10, expectedTarget.stress! + IMPERFECT_REPRODUCTION_STRESS_AMOUNT + 2),
  );
  const summoned = result.state.battle!.entities.filter(
    (entity) =>
      entity.monsterCardId === IMPERFECT_REPRODUCTION_SUMMON_CARD_ID &&
      entity.id.startsWith("ancestor1-imperfect-reproduction:"),
  );
  expect(summoned).toHaveLength(1);
  expect(summoned[0]!.stance).toBe("support");
  expect(summoned[0]!.guard).toBe(true);
  expect(summoned[0]!.statusStacks).toEqual([]);
  expect(result.state.battle!.entities.filter((entity) => entity.side === "monster").length).toBe(
    monstersBefore + 1,
  );
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
});

it("怪物姿态轨满则拒绝", () => {
  const game = onAncestorTurn(fillSupportStance(ancestor1Fighting()));
  const result = applyAncestor1ImperfectReproduction(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  expect(result.events.find((event) => event.type === "commandRefused")?.message).toContain(
    "无可用怪物姿态占位",
  );
});

it("非 ancestor1 形态或非 Ancestor 回合拒绝", () => {
  const onTurn = onAncestorTurn(ancestor1Fighting());
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
    applyAncestor1ImperfectReproduction(wrongForm, ancestor(wrongForm).id).events.some(
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
          actorId: onTurn.battle!.entities.find((entity) => entity.side === "hero")!.id,
          actions: 2,
          usedSkillIds: [],
        },
      },
    },
  };
  expect(
    applyAncestor1ImperfectReproduction(heroTurn, ancestor(heroTurn).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});

it("回归 Reflections Imperfect 死亡反噬", () => {
  const before = ancestor1Fighting();
  const result = killImperfectReflection(before);
  expect(ancestor(result.state).wounds).toBeGreaterThan(ancestor(before).wounds);
});

it("回归 Perfect Replication 空槽召唤", () => {
  const before = onAncestorTurn(ancestor1Fighting());
  const result = applyAncestor1PerfectReplication(before, ancestor(before).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.state.battle!.entities.some(
      (entity) => entity.monsterCardId === PERFECT && entity.guard,
    ),
  ).toBe(true);
});

it("回归 Time Heals All 满槽治疗", () => {
  let game = onAncestorTurn(fillSupportStance(ancestor1Fighting()));
  const wounded = game.battle!.entities.find((entity) => entity.monsterCardId === PERFECT)!;
  game = {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((entity) =>
        entity.id === wounded.id ? { ...entity, wounds: 8 } : entity,
      ),
    },
  };
  const result = applyAncestor1TimeHealsAll(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
});

it("显式命令经 applyCommand 接线", () => {
  const state = onAncestorTurn(ancestor1Fighting());
  const result = applyCommand(state, {
    type: "applyAncestor1ImperfectReproduction",
    actorId: ancestor(state).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" && event.message.includes("Imperfect Reproduction"),
    ),
  ).toBe(true);
});
