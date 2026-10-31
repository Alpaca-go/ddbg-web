import { expect, it } from "vitest";
import { applyCommand, type ApplyResult, type GameState } from "../command";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { coreQuestSources } from "../test-helpers/core-quest";
import {
  GESTATING_HEART_MONSTER_CARD_ID,
  applyGestatingHeartIchor,
  chainGestatingHeartIchorAfterHeroSkill,
} from "./gestating-heart-ichor";
import type { HeroSkillResolution } from "../hero-skill";

const smite = coreQuestSources.catalog.skills.find(
  (skill) => skill.hero === "CRUSADER" && skill.level === 1 && skill.name === "Smite",
)!;

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

function gestatingHeartDeployed(): GameState {
  let game = prepared("quest:p016");
  game = applyCommand(game, { type: "startBattle" }).state;
  const sequence = readFinalFormSequence(game)!;
  game = {
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
  game = applyCommand(game, { type: "finishDungeonBattle" }).state;
  return applyCommand(game, { type: "deployFinalBattleForm" }).state;
}

function gestatingHeartFighting(): GameState {
  const deployed = gestatingHeartDeployed();
  const sequence = readFinalFormSequence(deployed)!;
  expect(sequence.current!.id).toBe("gestatingHeart");
  expect(sequence.current!.combatReady).toBe(false);
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function heart(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === GESTATING_HEART_MONSTER_CARD_ID,
  )!;
}

function hero(state: GameState, id = "hero-0") {
  return state.battle!.entities.find((entity) => entity.id === id)!;
}

function resolution(
  targetId: string,
  damageDealt: number | null,
  overrides: Partial<HeroSkillResolution> = {},
): HeroSkillResolution {
  return {
    skillId: smite.id,
    targetId,
    status: "resolved",
    reason: null,
    outcome: damageDealt === null ? "miss" : "hit",
    effect: "damage",
    printedAmount: 8,
    damageDealt,
    riposteDamage: null,
    wounds: 0,
    actorWounds: null,
    targetDead: false,
    targetBleedCleared: false,
    targetBlightCleared: false,
    actorBleedCleared: false,
    actorBlightCleared: false,
    actorShuffle: null,
    targetShuffle: null,
    targetProtectionIgnored: false,
    actorStunMarkCleared: false,
    targetStunMarkCleared: false,
    actorForm: null,
    actorStress: null,
    targetStress: null,
    besideActorStress: null,
    untargetedBesideTargetStress: null,
    skipped: [],
    ...overrides,
  };
}

function chainWithDamage(state: GameState, damageDealt: number | null): ApplyResult {
  const target = heart(state);
  return chainGestatingHeartIchorAfterHeroSkill(
    {
      state,
      events: [
        {
          type: "heroSkillResolved",
          message: "test",
          actorId: "hero-0",
          roll: 5,
          resolution: resolution(target.id, damageDealt),
        },
      ],
    },
    state.battle!.entities,
    "hero-0",
  );
}

it("gestatingHeart 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(gestatingHeartDeployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("对 Gestating Heart 实际造成伤害 → 攻击者治疗 2 并施加 Blight 2/3t", () => {
  const before = gestatingHeartFighting();
  const woundsBefore = hero(before).wounds;
  const result = chainWithDamage(before, 5);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Ichor"),
    ),
  ).toBe(true);
  const after = hero(result.state);
  expect(after.wounds).toBe(Math.max(0, woundsBefore - 2));
  const blight = after.statusStacks?.find((stack) => stack.kind === "blight");
  expect(blight).toEqual({ kind: "blight", remaining: 3, amount: 2 });
});

it("0 伤或未造成伤害不触发 Ichor", () => {
  const before = gestatingHeartFighting();
  for (const damage of [0, null] as const) {
    const result = chainWithDamage(before, damage);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Ichor"),
      ),
    ).toBe(false);
    expect(hero(result.state).statusStacks?.some((stack) => stack.kind === "blight")).toBeFalsy();
  }
});

it("心已死亡时不触发", () => {
  let before = gestatingHeartFighting();
  const target = heart(before);
  before = {
    ...before,
    battle: {
      ...before.battle!,
      entities: before.battle!.entities.map((entity) =>
        entity.id === target.id ? { ...entity, wounds: entity.life!, dead: true } : entity,
      ),
    },
  };
  const result = chainWithDamage(before, 5);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Ichor"),
    ),
  ).toBe(false);
});

it("非 gestatingHeart 形态不触发", () => {
  const before = gestatingHeartFighting();
  const mutated: GameState = {
    ...before,
    dungeon: {
      ...before.dungeon!,
      finalFormSequence: {
        completedForms: [],
        status: "fighting",
      },
    },
  };
  const result = chainWithDamage(mutated, 4);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Ichor"),
    ),
  ).toBe(false);
});

it("applyGestatingHeartIchor：triggerCount 与 resolution 次数一致", () => {
  const before = gestatingHeartFighting();
  const woundsBefore = hero(before).wounds;
  const result = applyGestatingHeartIchor(before, "hero-0", 2);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Ichor"),
    ),
  ).toBe(true);
  expect(hero(result.state).wounds).toBe(Math.max(0, woundsBefore - 4));
  const blight = hero(result.state).statusStacks?.filter((stack) => stack.kind === "blight");
  expect(blight).toHaveLength(2);
  expect(blight!.every((stack) => stack.remaining === 3 && stack.amount === 2)).toBe(true);
});
