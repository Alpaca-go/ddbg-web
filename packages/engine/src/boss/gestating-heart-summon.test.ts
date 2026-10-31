import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import { GESTATING_HEART_MONSTER_CARD_ID } from "./gestating-heart-ichor";
import { applyGestatingHeartSummon } from "./gestating-heart-summon";

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

function onHeartTurn(state: GameState, rngCursor = 0): GameState {
  const actor = heart(state);
  return {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

it("gestatingHeart 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(gestatingHeartDeployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("空槽随机召唤最暗怪物并 finishTurn", () => {
  const before = onHeartTurn(gestatingHeartFighting(), 0);
  const result = applyGestatingHeartSummon(before, heart(before).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const summoned = result.state.battle!.entities.filter(
    (entity) =>
      entity.side === "monster" &&
      !entity.dead &&
      entity.monsterCardId !== GESTATING_HEART_MONSTER_CARD_ID,
  );
  expect(summoned).toHaveLength(1);
  expect(summoned[0]!.life).toBeGreaterThan(0);
  expect(summoned[0]!.dodge).toBeGreaterThanOrEqual(0);
  expect(summoned[0]!.areaId).toMatch(/^final-monster-/);
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  expect(result.state.battle!.rngCursor).toBeGreaterThan(before.battle!.rngCursor);
});

it("怪物姿态轨无空槽则拒绝", () => {
  const base = onHeartTurn(gestatingHeartFighting(), 0);
  const heartEntity = heart(base);
  const filled: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      entities: [
        ...base.battle!.entities,
        {
          id: "fill-def",
          side: "monster",
          hero: null,
          monsterCardId: "monster_medium:p072",
          life: 26,
          dodge: 3,
          areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.defensive,
          stance: "defensive",
          stanceSlots: 1,
          wounds: 0,
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        },
        {
          id: "fill-ranged",
          side: "monster",
          hero: null,
          monsterCardId: "monster_medium:p075",
          life: 28,
          dodge: 3,
          areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.ranged,
          stance: "ranged",
          stanceSlots: 1,
          wounds: 0,
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        },
        {
          id: "fill-support",
          side: "monster",
          hero: null,
          monsterCardId: "monster_medium:p078",
          life: 23,
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
  void heartEntity;
  const result = applyGestatingHeartSummon(filled, heart(filled).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  expect(
    result.events.find((event) => event.type === "commandRefused")?.message,
  ).toContain("无可用怪物姿态占位");
});

it("非 gestatingHeart 形态或非 Heart 回合拒绝", () => {
  const onTurn = onHeartTurn(gestatingHeartFighting(), 0);
  const wrongForm: GameState = {
    ...onTurn,
    dungeon: {
      ...onTurn.dungeon!,
      finalFormSequence: {
        completedForms: ["gestatingHeart"],
        status: "fighting",
      },
    },
  };
  expect(
    applyGestatingHeartSummon(wrongForm, heart(wrongForm).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);

  const heroTurn: GameState = {
    ...onTurn,
    battle: {
      ...onTurn.battle!,
      encounter: {
        ...onTurn.battle!.encounter!,
        turn: { type: "hero", actorId: "hero-0", actions: 1, usedSkillIds: [] },
      },
    },
  };
  expect(
    applyGestatingHeartSummon(heroTurn, heart(heroTurn).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});

it("场上已有召唤物仍允许再次 Summon（无 cardId 唯一约束）", () => {
  const first = applyGestatingHeartSummon(
    onHeartTurn(gestatingHeartFighting(), 0),
    heart(onHeartTurn(gestatingHeartFighting(), 0)).id,
  );
  expect(first.events.some((event) => event.type === "commandRefused")).toBe(false);
  const secondBase = onHeartTurn(first.state, first.state.battle!.rngCursor);
  const second = applyGestatingHeartSummon(secondBase, heart(secondBase).id);
  expect(second.events.some((event) => event.type === "commandRefused")).toBe(false);
  const extras = second.state.battle!.entities.filter(
    (entity) =>
      entity.side === "monster" &&
      !entity.dead &&
      entity.monsterCardId !== GESTATING_HEART_MONSTER_CARD_ID,
  );
  expect(extras.length).toBeGreaterThanOrEqual(2);
});

it("RNG 可复现：同 seed + rngCursor 抽到相同 cardId", () => {
  const a = applyGestatingHeartSummon(
    onHeartTurn(gestatingHeartFighting(), 3),
    heart(onHeartTurn(gestatingHeartFighting(), 3)).id,
  );
  const b = applyGestatingHeartSummon(
    onHeartTurn(gestatingHeartFighting(), 3),
    heart(onHeartTurn(gestatingHeartFighting(), 3)).id,
  );
  const pick = (state: GameState) =>
    state.battle!.entities.find((entity) => entity.id.startsWith("gestating-summon:"))!
      .monsterCardId;
  expect(pick(a.state)).toBe(pick(b.state));
});

it("显式命令经 applyCommand 接线", () => {
  const state = onHeartTurn(gestatingHeartFighting(), 0);
  const result = applyCommand(state, {
    type: "applyGestatingHeartSummon",
    actorId: heart(state).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === "dungeonUpdated" && event.message.includes("Gestating Heart · Summon"),
    ),
  ).toBe(true);
});

it("boss_ability:p036 combatReady 仍为 false", () => {
  const abilities = JSON.parse(
    readFileSync(
      new URL("../../../data/normalized/corebox/darkest_boss_abilities.json", import.meta.url),
      "utf8",
    ),
  );
  const card = abilities.cards.find((entry: { id: string }) => entry.id === "boss_ability:p036");
  expect(card?.combatReady).toBe(false);
});
