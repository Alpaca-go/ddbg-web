import { expect, it } from "vitest";
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
  });
}

it("未建立形态流程或补给未就绪时拒绝部署", () => {
  const base = finalPreparationFixture();
  expect(applyCommand(base, { type: "deployFinalBattleForm" }).state).toBe(base);
  const forms = applyCommand(
    {
      ...base,
      dungeon: {
        ...base.dungeon!,
        finalBattleProvisions: "ready",
        hamlet: {
          ...base.dungeon!.hamlet!,
          phase: "preparationComplete",
          remainingDays: 0,
          day: 4,
          finalPreparation: true,
          preparationDays: 4,
        },
      },
    },
    { type: "prepareFinalBattleForms" },
  ).state;
  expect(
    applyCommand(forms, { type: "deployFinalBattleForm" }).events.some(
      (e) => e.type === "commandRefused",
    ),
  ).toBe(false);
});

it("首形态部署进入 fighting 并登记 Boss 实体，不重复部署", () => {
  const result = prepared("quest:p016");
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const game = result.state;
  const sequence = readFinalFormSequence(game)!;
  expect(sequence.progress.status).toBe("fighting");
  expect(game.battle).toBeDefined();
  expect(game.dungeon!.phase).toBe("inBattle");
  expect(
    game.battle!.entities.some((e) => e.monsterCardId === sequence.current!.actor.cardId),
  ).toBe(true);
  expect(game.battle!.areas.every((a) => !a.ancestorGlory)).toBe(true);
  expect(result.events[0]?.type === "dungeonUpdated" && result.events[0].message).toContain("hold");
  expect(applyCommand(game, { type: "deployFinalBattleForm" }).state).toBe(game);
  expect(applyCommand(JSON.parse(JSON.stringify(game)), { type: "deployFinalBattleForm" })).toEqual(
    applyCommand(game, { type: "deployFinalBattleForm" }),
  );
});

it("Ancestor 1 登记 Reflections 支援实体", () => {
  const game = prepared("quest:p016").state;
  const ids = game.battle!.entities.filter((e) => e.side === "monster").map((e) => e.monsterCardId);
  expect(ids).toEqual(["monster_medium:p105", "monster_medium:p106", "monster_medium:p109"]);
  const reflections = game.battle!.entities.filter(
    (e) => e.monsterCardId === "monster_medium:p106" || e.monsterCardId === "monster_medium:p109",
  );
  expect(reflections.every((e) => e.guard)).toBe(true);
  expect(game.battle!.entities.find((e) => e.monsterCardId === "monster_medium:p105")!.guard).toBe(
    false,
  );
});

it("存档白名单包含 deployFinalBattleForm", () => {
  expect(savedCommandSchema.safeParse({ type: "deployFinalBattleForm" }).success).toBe(true);
});
