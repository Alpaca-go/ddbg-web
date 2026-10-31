import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finishTurn } from "../encounter";
import { nextBattleRoll } from "../battle-roll";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import {
  applyHeartOfDarknessImpendingDoomRoll,
  HEART_OF_DARKNESS_MONSTER_CARD_ID,
  impendingDoomSkillSlotFromDie,
} from "./heart-of-darkness-impending-doom";
import {
  applyHeartOfDarknessImpendingDoomSkill,
  DISSOLUTION_SKILL_SLOT,
  KNOW_THIS_SKILL_SLOT,
  PUNCTURE_SKILL_SLOT,
} from "./heart-of-darkness-skills-acc";
import { GESTATING_HEART_MONSTER_CARD_ID } from "./gestating-heart-ichor";

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
  const sequence = readFinalFormSequence(deployed)!;
  expect(sequence.current!.id).toBe("heartOfDarkness");
  expect(sequence.current!.combatReady).toBe(false);
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function heartEntity(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === HEART_OF_DARKNESS_MONSTER_CARD_ID,
  )!;
}

function onHeartTurn(state: GameState): GameState {
  const actor = heartEntity(state);
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

it("heartOfDarkness 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(heartOfDarknessDeployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("startBattle 写入 impendingDoomDie 并消费 rngCursor", () => {
  const deployed = heartOfDarknessDeployed();
  const cursorBefore = deployed.battle!.rngCursor;
  const expectedDie = nextBattleRoll(deployed.seed, cursorBefore);
  const started = applyCommand(deployed, { type: "startBattle" }).state;
  expect(started.battle!.impendingDoomDie).toBe(expectedDie);
  expect(started.battle!.rngCursor).toBeGreaterThan(cursorBefore + 1);
  expect(started.battle!.impendingDoomDie).toBeGreaterThanOrEqual(1);
  expect(started.battle!.impendingDoomDie).toBeLessThanOrEqual(10);
});

it("Heart finishTurn 后覆盖 impendingDoomDie", () => {
  const fighting = heartOfDarknessFighting();
  const cursorAfterStart = fighting.battle!.rngCursor;
  const onTurn = onHeartTurn(fighting);
  const finished = finishTurn(onTurn, heartEntity(onTurn).id, []);
  expect(finished.events.some((event) => event.type === "commandRefused")).toBe(false);
  const expectedDie = nextBattleRoll(fighting.seed, cursorAfterStart);
  expect(finished.state.battle!.impendingDoomDie).toBe(expectedDie);
  expect(finished.state.battle!.rngCursor).toBe(cursorAfterStart + 1);
});

it("显式 applyHeartOfDarknessImpendingDoomRoll 覆盖落位", () => {
  const fighting = heartOfDarknessFighting();
  const onTurn = onHeartTurn(fighting);
  const cursor = onTurn.battle!.rngCursor;
  const result = applyHeartOfDarknessImpendingDoomRoll(onTurn, heartEntity(onTurn).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(result.state.battle!.impendingDoomDie).toBe(nextBattleRoll(fighting.seed, cursor));
  expect(result.state.battle!.rngCursor).toBe(cursor + 1);
});

it("非 heartOfDarkness 形态拒绝显式落骰", () => {
  let game = prepared("quest:p016");
  game = applyCommand(game, { type: "startBattle" }).state;
  const ancestor = game.battle!.entities.find(
    (entity) => entity.monsterCardId === "monster_medium:p105",
  )!;
  game = {
    ...game,
    battle: {
      ...game.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: ancestor.id },
      },
    },
  };
  const result = applyHeartOfDarknessImpendingDoomRoll(game, ancestor.id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  expect(result.state.battle!.impendingDoomDie).toBeUndefined();
});

it("gestatingHeart 形态 startBattle 不写 impendingDoomDie", () => {
  let game = prepared("quest:p016");
  game = advanceFinalForm(game);
  const sequence = readFinalFormSequence(game)!;
  expect(sequence.current!.id).toBe("gestatingHeart");
  const started = applyCommand(game, { type: "startBattle" }).state;
  expect(started.battle!.impendingDoomDie).toBeUndefined();
  expect(
    started.battle!.entities.some(
      (entity) => entity.monsterCardId === GESTATING_HEART_MONSTER_CARD_ID,
    ),
  ).toBe(true);
});

it("相同种子与命令序列可复现落位", () => {
  const a = heartOfDarknessFighting();
  const b = heartOfDarknessFighting();
  expect(a.battle!.impendingDoomDie).toBe(b.battle!.impendingDoomDie);
  expect(a.battle!.rngCursor).toBe(b.battle!.rngCursor);
});

it("applyCommand 路由显式落骰命令", () => {
  const onTurn = onHeartTurn(heartOfDarknessFighting());
  const routed = applyCommand(onTurn, {
    type: "applyHeartOfDarknessImpendingDoomRoll",
    actorId: heartEntity(onTurn).id,
  });
  expect(routed.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(routed.state.battle!.impendingDoomDie).toBeDefined();
});

const GOLDEN_D10_SLOTS: ReadonlyArray<readonly [number, 1 | 2 | 3]> = [
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 2],
  [6, 2],
  [7, 2],
  [8, 3],
  [9, 3],
  [10, 3],
];

it.each(GOLDEN_D10_SLOTS)("R-139 黄金表：d10=%i → slot %i", (die, slot) => {
  expect(impendingDoomSkillSlotFromDie(die)).toBe(slot);
});

it.each([0, 11, -1, 1.5, NaN])("非法 d10 面值拒绝映射", (die) => {
  expect(impendingDoomSkillSlotFromDie(die)).toBeNull();
});

it("无 impendingDoomDie 拒绝 Impending Doom 选招", () => {
  const fighting = heartOfDarknessFighting();
  const { impendingDoomDie: _removed, ...battleWithoutDie } = fighting.battle!;
  const onTurn = onHeartTurn({
    ...fighting,
    battle: battleWithoutDie,
  });
  const result = applyHeartOfDarknessImpendingDoomSkill(onTurn, heartEntity(onTurn).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
});

it("非法 impendingDoomDie 拒绝 Impending Doom 选招", () => {
  const onTurn = onHeartTurn({
    ...heartOfDarknessFighting(),
    battle: {
      ...heartOfDarknessFighting().battle!,
      impendingDoomDie: 0,
    },
  });
  const result = applyHeartOfDarknessImpendingDoomSkill(onTurn, heartEntity(onTurn).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
});

it("开战落骰后 Heart 回合按映射执行 Puncture（d10=5）", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  let game = onHeartTurn({
    ...fighting,
    battle: {
      ...fighting.battle!,
      impendingDoomDie: 5,
      entities: fighting.battle!.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, areaId: heartEntity(fighting).areaId } : entity,
      ),
    },
  });
  const result = applyHeartOfDarknessImpendingDoomSkill(game, heartEntity(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" &&
        event.message.includes("d10=5 → Puncture") &&
        event.message.includes(`slot ${PUNCTURE_SKILL_SLOT}`),
    ),
  ).toBe(true);
  const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
  expect(skillEvent?.type).toBe("monsterSkillResolved");
});

it("行动后落骰覆盖后下一 Heart 回合按新面值选招（d10=8 → Dissolution）", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  const cursor = fighting.battle!.rngCursor;
  let game = onHeartTurn({
    ...fighting,
    battle: {
      ...fighting.battle!,
      impendingDoomDie: 8,
      entities: fighting.battle!.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, areaId: heartEntity(fighting).areaId } : entity,
      ),
    },
  });
  const result = applyHeartOfDarknessImpendingDoomSkill(game, heartEntity(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" &&
        event.message.includes("d10=8 → Dissolution") &&
        event.message.includes(`slot ${DISSOLUTION_SKILL_SLOT}`),
    ),
  ).toBe(true);
  const expectedNextDie = nextBattleRoll(fighting.seed, cursor + 1);
  expect(result.state.battle!.impendingDoomDie).toBe(expectedNextDie);
});

it("applyCommand 路由 Impending Doom 选招", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  const state = onHeartTurn({
    ...fighting,
    battle: {
      ...fighting.battle!,
      impendingDoomDie: 1,
      entities: fighting.battle!.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, areaId: heartEntity(fighting).areaId } : entity,
      ),
    },
  });
  const result = applyCommand(state, {
    type: "applyHeartOfDarknessImpendingDoomSkill",
    actorId: heartEntity(state).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" &&
        event.message.includes(`slot ${KNOW_THIS_SKILL_SLOT}`),
    ),
  ).toBe(true);
});
