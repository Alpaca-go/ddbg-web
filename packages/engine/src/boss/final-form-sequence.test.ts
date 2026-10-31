import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { createBattleState, type BattleEntity } from "../battle";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import { readFinalFormSequence } from "./final-form-sequence";
import { savedCommandSchema } from "../../../data/src/quest-save";

it("补给未完成不能开始形态；已建立流程不能重复创建或改写进度", () => {
  const base = finalPreparationFixture();
  expect(applyCommand(base, { type: "prepareFinalBattleForms" }).state).toBe(base);
  const game = prepared("quest:p016");
  expect(applyCommand(game, { type: "prepareFinalBattleForms" }).state).toBe(game);
});

function prepared(questId: "quest:p016" | "quest:p017" | "quest:p018") {
  const base = finalPreparationFixture(questId);
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  // 形态流程夹具：四天/补给完成由独立命令场景覆盖，不声称自然最暗胜利。
  const state: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: { ...begun.dungeon!.hamlet!, phase: "preparationComplete", remainingDays: 0, day: 4 },
    },
  };
  const result = applyCommand(state, { type: "prepareFinalBattleForms" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
function victory(game: GameState): GameState {
  const sequence = readFinalFormSequence(game)!;
  const hero: BattleEntity = {
    id: "h",
    side: "hero",
    hero: "CRUSADER",
    areaId: "logical",
    life: 30,
    wounds: 7,
    stress: 6,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    skillIds: [],
    stance: "defensive",
  };
  const boss: BattleEntity = {
    ...hero,
    id: "boss",
    side: "monster",
    hero: null,
    dead: true,
    monsterCardId: sequence.current!.actor.cardId,
  };
  const battle = createBattleState(game.seed, {
    entities: [],
    areas: [{ id: "logical", adjacent: [], capacity: 8, elevation: "normal" }],
    skills: [],
    light: 4,
  }).battle!;
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      finalFormSequence: {
        ...game.dungeon!.finalFormSequence!,
        status: "fighting",
      },
    },
    battle: {
      ...battle,
      entities: [hero, boss],
      encounter: {
        round: 7,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
}
it.each(["quest:p016", "quest:p017", "quest:p018"] as const)(
  "%s 按取消后的三形态推进，保留英雄/资源/同一战场且Heart不能跳过",
  (id) => {
    let game = prepared(id);
    const plan = readFinalFormSequence(game)!;
    expect(plan.forms).toHaveLength(3);
    expect(plan.forms.map((f) => f.id)).not.toContain(plan.skippedForm);
    expect(plan.forms.at(-1)!.id).toBe("heartOfDarkness");
    expect(game.battle).toBeUndefined();
    expect(applyCommand(game, { type: "finishDungeonBattle" }).state).toBe(game);
    for (let i = 0; i < 3; i++) {
      const before = victory(game),
        snapshot = structuredClone(before);
      const command = { type: "finishDungeonBattle" } as const;
      const result = applyCommand(before, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      expect(before).toEqual(snapshot);
      expect(result.state.battle).toBe(before.battle);
      expect(result.state.dungeon!.heroes).toBe(before.dungeon!.heroes);
      expect(result.state.dungeon!.explorationSetup).toBe(before.dungeon!.explorationSetup);
      expect(result.state.dungeon!.cursor).toBe(before.dungeon!.cursor);
      expect(applyCommand(JSON.parse(JSON.stringify(before)), command)).toEqual(result);
      game = result.state;
      expect(game.dungeon!.finalFormSequence!.completedForms).toEqual(
        plan.forms.slice(0, i + 1).map((f) => f.id),
      );
      expect(game.dungeon!.finalFormSequence!.status).toBe(
        i === 2 ? "complete" : "awaitingDeployment",
      );
      expect(applyCommand(game, command).state).toBe(game);
    }
  },
);
it("普通怪胜利、仍存活Boss、撤退、无活英雄和损坏形态前缀均不推进", () => {
  const base = victory(prepared("quest:p016"));
  const states: GameState[] = [
    {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.side === "monster" ? { ...e, monsterCardId: "monster_medium:p001" } : e,
        ),
      },
    },
    {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => ({ ...e, dead: false })),
      },
    },
    {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => ({ ...e, dead: true })),
      },
    },
    {
      ...base,
      battle: {
        ...base.battle!,
        encounter: { ...base.battle!.encounter!, turn: { type: "finished", outcome: "retreat" } },
      },
    },
    {
      ...base,
      dungeon: {
        ...base.dungeon!,
        finalFormSequence: { completedForms: ["heartOfDarkness"], status: "fighting" },
      },
    },
  ];
  for (const state of states)
    expect(applyCommand(state, { type: "finishDungeonBattle" }).state).toBe(state);
  expect(savedCommandSchema.safeParse({ type: "prepareFinalBattleForms" }).success).toBe(true);
});
