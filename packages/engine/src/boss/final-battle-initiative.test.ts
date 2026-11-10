import { expect, it } from "vitest";
import { finishTurn } from "../encounter";
import { applyCommand, type GameState } from "../command";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { savedCommandSchema } from "../../../data/src/quest-save";

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

function started(game: GameState) {
  const result = applyCommand(game, { type: "startBattle" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
it("部署并开始：与显式两命令状态一致，旧存档仍按旧入口，不重置 RNG", () => {
  const base = prepared();
  const { battle: _battle, ...without } = base;
  void _battle;
  const state: GameState = {
    ...without,
    dungeon: {
      ...base.dungeon!,
      finalFormSequence: { ...base.dungeon!.finalFormSequence!, status: "awaitingDeployment" },
    },
  };
  const command = { type: "deployFinalBattleForm", startBattle: true } as const;
  expect(savedCommandSchema.parse(command)).toEqual(command);
  expect(savedCommandSchema.parse({ type: "deployFinalBattleForm" })).toEqual({
    type: "deployFinalBattleForm",
  });
  expect(
    savedCommandSchema.safeParse({ type: "deployFinalBattleForm", startBattle: false }).success,
  ).toBe(false);
  const two = started(applyCommand(state, { type: "deployFinalBattleForm" }).state);
  const one = applyCommand(state, command);
  expect(one.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(one.state).toEqual(two);
  expect(applyCommand(state, command)).toEqual(one);
  expect(one.state.battle!.rngCursor).toBeGreaterThan(state.dungeon!.cursor);
});

it("部署后 startBattle 重洗先攻并进入第 1 轮 awaitingInitiative", () => {
  const game = prepared("quest:p016");
  expect(game.battle!.encounter).toBeUndefined();
  const afterStart = started(game);
  const battle = afterStart.battle!;
  expect(battle.encounter).toEqual({
    round: 1,
    deck: expect.any(Array),
    actedIds: [],
    turn: { type: "awaitingInitiative" },
  });
  expect(battle.encounter!.deck).toHaveLength(8);
  expect(battle.rngCursor).toBeGreaterThan(game.battle!.rngCursor);
  expect(applyCommand(afterStart, { type: "startBattle" }).state).toBe(afterStart);
});

it("Ancestor 1 支援卡占位姿态不重叠，可过 startBattle 校验", () => {
  const monsters = prepared("quest:p016").battle!.entities.filter((e) => e.side === "monster");
  const stances = monsters.map((e) => e.stance);
  expect(new Set(stances).size).toBe(stances.length);
});

it("形态间再部署后须重新 startBattle，不得沿用上一形态 encounter", () => {
  let game = prepared("quest:p016");
  game = started(game);
  const sequence = readFinalFormSequence(game)!;
  game = {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((e) =>
        e.monsterCardId === sequence.current!.actor.cardId ? { ...e, dead: true } : e,
      ),
      encounter: {
        round: 4,
        deck: [],
        actedIds: ["stale"],
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
  game = applyCommand(game, { type: "finishDungeonBattle" }).state;
  expect(game.dungeon!.finalFormSequence!.status).toBe("awaitingDeployment");
  game = applyCommand(game, { type: "deployFinalBattleForm" }).state;
  expect(game.battle!.encounter).toBeUndefined();
  const battle = started(game).battle!;
  expect(battle.encounter!.round).toBe(1);
  expect(battle.encounter!.turn).toEqual({ type: "awaitingInitiative" });
  expect(battle.encounter!.actedIds).toEqual([]);
});

it("drawInitiative 在最终战 fighting 下可续接回合", () => {
  const game = started(prepared("quest:p016"));
  const drawn = applyCommand(game, { type: "drawInitiative" });
  expect(drawn.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(drawn.state.battle!.encounter!.turn.type).not.toBe("awaitingInitiative");
});

it("R-218：Ancestor 2 两张怪物先攻均给本体，Nothingness 不行动", () => {
  const game = started(prepared("quest:p017"));
  const battle = game.battle!;
  const actor = battle.entities.find((e) => e.monsterCardId === "monster_large:p018")!;
  const { provisionWindows, ...directBattle } = battle;
  expect(provisionWindows).toBe(true);
  expect(battle.encounter!.deck.filter((side) => side === "monster")).toHaveLength(2);
  let state: GameState = {
    ...game,
    battle: {
      ...directBattle,
      encounter: { ...battle.encounter!, deck: ["monster", "monster", "hero"] },
    },
  };
  for (let action = 1; action <= 2; action++) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    expect(state.battle!.encounter!.turn).toEqual({ type: "monster", actorId: actor.id });
    const result = finishTurn(state, actor.id, []);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    state = result.state;
    expect(state.battle!.encounter!.actedIds.includes(actor.id)).toBe(action === 2);
  }
});

it("R-218：Reflection 已行动时，剩余怪物先攻交给 Ancestor", () => {
  const game = started(prepared());
  const battle = game.battle!;
  const actor = battle.entities.find((e) => e.monsterCardId === "monster_medium:p105")!;
  const { provisionWindows, ...directBattle } = battle;
  expect(provisionWindows).toBe(true);
  const before: GameState = {
    ...game,
    battle: {
      ...directBattle,
      encounter: {
        ...battle.encounter!,
        deck: ["monster", "hero"],
        actedIds: battle.entities.filter((e) => e.side === "monster").map((e) => e.id),
      },
    },
  };
  const drawn = applyCommand(before, { type: "drawInitiative" });
  expect(drawn.state.battle!.encounter!.turn).toEqual({ type: "monster", actorId: actor.id });
});
