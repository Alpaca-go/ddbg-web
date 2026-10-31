import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { finishTurn } from "../encounter";
import { nextBattleRoll } from "../battle-roll";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import {
  ANCESTOR_2_MONSTER_CARD_ID,
  applyAncestor2SwiftTeleportation,
  swiftTeleportStanceFromDie,
} from "./ancestor2-swift-teleportation";
import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import { isAbsoluteNothingnessEntity } from "./ancestor2-absolute-nothingness";

function withoutAbsoluteNothingness(game: GameState): GameState {
  return {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.filter((entity) => !isAbsoluteNothingnessEntity(entity)),
    },
  };
}

function prepared(questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p017") {
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

function ancestor2Deployed(): GameState {
  const game = prepared("quest:p017");
  const sequence = readFinalFormSequence(game)!;
  expect(sequence.current!.id).toBe("ancestor2");
  return game;
}

function ancestor2Fighting(): GameState {
  const deployed = withoutAbsoluteNothingness(ancestor2Deployed());
  expect(readFinalFormSequence(deployed)!.current!.combatReady).toBe(false);
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function ancestor(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === ANCESTOR_2_MONSTER_CARD_ID,
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
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

function withBattleRngCursor(state: GameState, cursor: number): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor: cursor,
    },
  };
}

it("ancestor2 形态 combatReady 仍为 false", () => {
  const sequence = readFinalFormSequence(ancestor2Deployed())!;
  expect(sequence.current!.combatReady).toBe(false);
});

it("swiftTeleportStanceFromDie 映射 1–3/4–6/7–9/10", () => {
  expect(swiftTeleportStanceFromDie(1)).toBe("defensive");
  expect(swiftTeleportStanceFromDie(3)).toBe("defensive");
  expect(swiftTeleportStanceFromDie(4)).toBe("ranged");
  expect(swiftTeleportStanceFromDie(6)).toBe("ranged");
  expect(swiftTeleportStanceFromDie(7)).toBe("support");
  expect(swiftTeleportStanceFromDie(9)).toBe("support");
  expect(swiftTeleportStanceFromDie(10)).toBeNull();
});

it("显式命令：1–3 落 defensive 区", () => {
  const game = withBattleRngCursor(onAncestorTurn(ancestor2Fighting()), 0);
  const cursorBefore = game.battle!.rngCursor;
  const expectedDie = nextBattleRoll(game.seed, cursorBefore);
  expect(swiftTeleportStanceFromDie(expectedDie)).toBe("defensive");

  const result = applyAncestor2SwiftTeleportation(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(result.state.battle!.rngCursor).toBe(cursorBefore + 1);
  expect(ancestor(result.state)).toMatchObject({
    stance: "defensive",
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.defensive,
  });
});

it("显式命令：4–6 落 ranged 区", () => {
  let game = ancestor2Fighting();
  game = withBattleRngCursor(onAncestorTurn(game), 0);
  let cursor = 0;
  while (nextBattleRoll(game.seed, cursor) < 4 || nextBattleRoll(game.seed, cursor) > 6) cursor += 1;
  game = withBattleRngCursor(game, cursor);

  const result = applyAncestor2SwiftTeleportation(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(ancestor(result.state)).toMatchObject({
    stance: "ranged",
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.ranged,
  });
});

it("显式命令：10 不移动", () => {
  let game = ancestor2Fighting();
  let cursor = 0;
  while (nextBattleRoll(game.seed, cursor) !== 10) cursor += 1;
  game = withBattleRngCursor(onAncestorTurn(game), cursor);
  const before = ancestor(game);

  const result = applyAncestor2SwiftTeleportation(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(ancestor(result.state)).toMatchObject({
    stance: before.stance,
    areaId: before.areaId,
  });
  expect(result.state.battle!.rngCursor).toBe(cursor + 1);
});

it("大型怪 7–9 support 姿态轨无连续空位时不移动", () => {
  let game = ancestor2Fighting();
  let cursor = 0;
  while (nextBattleRoll(game.seed, cursor) < 7 || nextBattleRoll(game.seed, cursor) > 9) cursor += 1;
  game = withBattleRngCursor(onAncestorTurn(game), cursor);
  const before = ancestor(game);

  const result = applyAncestor2SwiftTeleportation(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(ancestor(result.state)).toMatchObject({
    stance: before.stance,
    areaId: before.areaId,
  });
  expect(result.events.some((event) => event.message.includes("无连续空位"))).toBe(true);
});

it("finishTurn 钩子落点与 rngCursor", () => {
  const fighting = ancestor2Fighting();
  let cursor = 0;
  while (nextBattleRoll(fighting.seed, cursor) !== 2) cursor += 1;
  const game = withBattleRngCursor(onAncestorTurn(fighting), cursor);
  const finished = finishTurn(game, ancestor(game).id, []);
  expect(finished.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(finished.state.battle!.rngCursor).toBe(cursor + 1);
  expect(ancestor(finished.state)).toMatchObject({
    stance: "defensive",
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.defensive,
  });
});

it("非 ancestor2 形态拒绝", () => {
  const onTurn = onAncestorTurn(ancestor2Fighting());
  const refused = applyAncestor2SwiftTeleportation(
    {
      ...onTurn,
      dungeon: {
        ...onTurn.dungeon!,
        finalFormSequence: {
          completedForms: ["ancestor2"],
          status: "fighting",
        },
      },
      battle: {
        ...onTurn.battle!,
        entities: onTurn.battle!.entities.map((entity) =>
          entity.monsterCardId === ANCESTOR_2_MONSTER_CARD_ID
            ? { ...entity, monsterCardId: "monster_large:p019" }
            : entity,
        ),
      },
    },
    ancestor(onTurn).id,
  );
  expect(refused.events.some((event) => event.type === "commandRefused")).toBe(true);
});

it("非 Ancestor 2 实体拒绝", () => {
  const game = onAncestorTurn(ancestor2Fighting());
  const refused = applyAncestor2SwiftTeleportation(game, "final-ancestor1-actor");
  expect(refused.events.some((event) => event.type === "commandRefused")).toBe(true);
});

it("RNG 可复现：同 seed+cursor 同落点", () => {
  const base = withBattleRngCursor(onAncestorTurn(ancestor2Fighting()), 5);
  const a = applyAncestor2SwiftTeleportation(base, ancestor(base).id);
  const b = applyAncestor2SwiftTeleportation(base, ancestor(base).id);
  expect(a.state.battle!.rngCursor).toBe(b.state.battle!.rngCursor);
  expect(ancestor(a.state)).toEqual(ancestor(b.state));
});

it("deploy 后 Ancestor 2 仍为 aggressive 占位", () => {
  const deployed = ancestor2Deployed();
  expect(ancestor(deployed)).toMatchObject({
    monsterCardId: ANCESTOR_2_MONSTER_CARD_ID,
    stance: "aggressive",
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.aggressive,
    stanceSlots: 2,
  });
});

it("ancestor1 形态不触发 finishTurn 传送", () => {
  let game = prepared("quest:p016");
  game = applyCommand(game, { type: "startBattle" }).state;
  const actor = game.battle!.entities.find((e) => e.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID)!;
  game = {
    ...game,
    battle: {
      ...game.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
  const before = actor.areaId;
  const finished = finishTurn(game, actor.id, []);
  const after = finished.state.battle!.entities.find((e) => e.id === actor.id)!;
  expect(after.areaId).toBe(before);
});
