import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { HEART_OF_DARKNESS_MONSTER_CARD_ID } from "./heart-of-darkness-impending-doom";
import {
  DISSOLUTION_SKILL_SLOT,
  KNOW_THIS_SKILL_SLOT,
  PUNCTURE_SKILL_SLOT,
} from "./heart-of-darkness-skills-acc";
import { heartOfDarknessImpendingDoomShouldReplaceSkill } from "./heart-of-darkness-combat-runtime";

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
  expect(readFinalFormSequence(deployed)!.current!.id).toBe("heartOfDarkness");
  expect(readFinalFormSequence(deployed)!.current!.combatReady).toBe(false);
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function heartEntity(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === HEART_OF_DARKNESS_MONSTER_CARD_ID,
  )!;
}

function onHeartTurn(state: GameState, impendingDoomDie?: number): GameState {
  const actor = heartEntity(state);
  const hero = state.battle!.entities.find((entry) => entry.side === "hero")!;
  return {
    ...state,
    battle: {
      ...state.battle!,
      ...(impendingDoomDie === undefined ? {} : { impendingDoomDie }),
      entities: state.battle!.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, areaId: actor.areaId } : entity,
      ),
      encounter: {
        round: 1,
        deck: ["hero", "monster"] as const,
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
      monsterAction: null,
    },
  };
}

it("prepareMonsterAction：Heart 回合走 Impending Doom 映射（d10=5 → Puncture）", () => {
  const fighting = heartOfDarknessFighting();
  const game = onHeartTurn(fighting, 5);
  expect(heartOfDarknessImpendingDoomShouldReplaceSkill(game, heartEntity(game).id)).toBe(true);
  const result = applyCommand(game, {
    type: "prepareMonsterAction",
    actorId: heartEntity(game).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" &&
        event.message.includes("d10=5 → Puncture") &&
        event.message.includes(`slot ${PUNCTURE_SKILL_SLOT}`),
    ),
  ).toBe(true);
  expect(result.events.some((event) => event.type === "monsterSkillResolved")).toBe(true);
});

it("prepareMonsterAction：无 impendingDoomDie 拒绝（与显式选招一致）", () => {
  const fighting = heartOfDarknessFighting();
  const battleWithoutDie = { ...fighting.battle! };
  delete battleWithoutDie.impendingDoomDie;
  const game = onHeartTurn({ ...fighting, battle: battleWithoutDie });
  const result = applyCommand(game, {
    type: "prepareMonsterAction",
    actorId: heartEntity(game).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
});

it("prepareMonsterAction：非法 impendingDoomDie 拒绝", () => {
  const game = onHeartTurn(heartOfDarknessFighting(), 0);
  const result = applyCommand(game, {
    type: "prepareMonsterAction",
    actorId: heartEntity(game).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
});

it("prepareMonsterAction：d10=1 → Know This（slot 1）", () => {
  const game = onHeartTurn(heartOfDarknessFighting(), 1);
  const result = applyCommand(game, {
    type: "prepareMonsterAction",
    actorId: heartEntity(game).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" && event.message.includes(`slot ${KNOW_THIS_SKILL_SLOT}`),
    ),
  ).toBe(true);
});

it("prepareMonsterAction：d10=10 → Dissolution（slot 3）", () => {
  const game = onHeartTurn(heartOfDarknessFighting(), 10);
  const result = applyCommand(game, {
    type: "prepareMonsterAction",
    actorId: heartEntity(game).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" && event.message.includes(`slot ${DISSOLUTION_SKILL_SLOT}`),
    ),
  ).toBe(true);
});

it("非 Heart 形态怪物回合不接管 prepareMonsterAction", () => {
  const gestating = advanceFinalForm(prepared("quest:p016"));
  const fought = applyCommand(gestating, { type: "startBattle" }).state;
  const boss = fought.battle!.entities.find((entity) => entity.side === "monster")!;
  const onTurn = {
    ...fought,
    battle: {
      ...fought.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"] as const,
        actedIds: [],
        turn: { type: "monster" as const, actorId: boss.id },
      },
    },
  };
  expect(heartOfDarknessImpendingDoomShouldReplaceSkill(onTurn, boss.id)).toBe(false);
});
