import { expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "./command";
import { finalPreparationFixture } from "./test-helpers/final-preparation";
import { savedCommandSchema } from "../../data/src/quest-save";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
function ready(seed: number, mode: "standard" | "radiant") {
  const base = finalPreparationFixture();
  let game = ok(
    { ...base, seed, dungeon: { ...base.dungeon!, mode } },
    { type: "beginFinalPreparation" },
  );
  for (let day = 0; day < 4; day++) {
    game = ok(game, { type: "rollHamletCaretaker" });
    game = ok(game, {
      type: "useHamletSkill",
      actorId: game.dungeon!.hamlet!.heroOrder[0]!,
      skill: "zealousSpeech",
    });
  }
  return game;
}
it.each(["standard", "radiant"] as const)(
  "%s 最终战补给复用8颗常规骰，保留任务历史，不触发探索",
  (mode) => {
    for (const seed of [1, 23, 81]) {
      const initial = ready(seed, mode),
        cursor = initial.dungeon!.cursor;
      let game = ok(initial, { type: "beginFinalBattleProvisions" });
      expect(
        applyCommand(JSON.parse(JSON.stringify(initial)), { type: "beginFinalBattleProvisions" })
          .state,
      ).toEqual(game);
      expect(game.dungeon!.cursor).toBe(cursor);
      game = ok(game, { type: "rollDungeonProvisions" });
      expect(game.dungeon!.cursor).toBe(cursor + (mode === "radiant" ? 4 : 8));
      while (game.dungeon!.pending) {
        expect(game.dungeon!.pending!.id).toMatch(/^dungeon-starting-provisions:/);
        game = ok(game, {
          type: "resolveChoice",
          choiceId: game.dungeon!.pending!.id,
          optionId: "torch",
        });
      }
      expect(game.dungeon!.finalBattleProvisions).toBe("ready");
      expect(game.dungeon!.phase).toBe("inHamlet");
      expect(game.dungeon!.explorationSetup!.provisions).toHaveLength(8);
      expect(game.dungeon!.rooms).toEqual(initial.dungeon!.rooms);
      expect(game.dungeon!.layout).toEqual(initial.dungeon!.layout);
      expect(game.dungeon!.questSummary).toEqual(initial.dungeon!.questSummary);
      expect(game.dungeon!.hamletMemory).toEqual(initial.dungeon!.hamletMemory);
      expect(game.battle).toBeUndefined();
      for (const command of [
        { type: "rollDungeonProvisions" },
        { type: "beginFinalBattleProvisions" },
        { type: "beginDungeonExploration" },
        { type: "offerNextQuest" },
      ] as const)
        expect(applyCommand(game, command).state).toBe(game);
    }
  },
);
it("英雄奖励骰保留16颗上限且只消费一次；非法待选不重掷", () => {
  const initial = ready(23, "radiant");
  const game = ok(
    {
      ...initial,
      dungeon: {
        ...initial.dungeon!,
        heroes: initial.dungeon!.heroes.map((h) => ({ ...h, nextQuestProvisionDice: 4 })),
      },
    },
    { type: "beginFinalBattleProvisions" },
  );
  let rolled = ok(game, { type: "rollDungeonProvisions" });
  expect(rolled.dungeon!.cursor).toBe(game.dungeon!.cursor + 12);
  expect(rolled.dungeon!.heroes.every((h) => h.nextQuestProvisionDice === undefined)).toBe(true);
  expect(applyCommand(rolled, { type: "rollDungeonProvisions" }).state).toBe(rolled);
  expect(
    applyCommand(rolled, { type: "resolveChoice", choiceId: "invalid", optionId: "torch" }).state,
  ).toBe(rolled);
  while (rolled.dungeon!.pending)
    rolled = ok(rolled, {
      type: "resolveChoice",
      choiceId: rolled.dungeon!.pending!.id,
      optionId: "torch",
    });
  expect(rolled.dungeon!.explorationSetup!.provisions).toHaveLength(16);
});
it("四天未完成或已存在补给不能启动；命令加入存档白名单", () => {
  const unprepared = finalPreparationFixture();
  expect(applyCommand(unprepared, { type: "beginFinalBattleProvisions" }).state).toBe(unprepared);
  const initial = ready(23, "standard");
  const bad = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      explorationSetup: {
        ...initial.dungeon!.explorationSetup!,
        provisions: [{ id: "old", face: "torch" as const }],
      },
    },
  };
  expect(applyCommand(bad, { type: "beginFinalBattleProvisions" }).state).toBe(bad);
  expect(savedCommandSchema.safeParse({ type: "beginFinalBattleProvisions" }).success).toBe(true);
});
