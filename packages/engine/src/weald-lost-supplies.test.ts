import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty } from "./test-helpers/core-quest";
import { wealdTaskSources, wealdTaskBattleFixture } from "./test-helpers/weald-task-battle";
import { applyCommand, type GameState } from "./command";
import { createLootState, nextProvisionFace } from "./loot";

function initial() {
  return createCoreDungeonQuest(
    0,
    "quest:weald:p010",
    "radiant",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    ["core", "weald"],
    undefined,
    undefined,
    "tasks-v1",
  );
}
it("p010 不掷常规骰，保留技能奖励骰与 Wild", () => {
  const game = initial();
  const empty = applyCommand(game, { type: "rollDungeonProvisions" });
  expect(empty.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(empty.state.dungeon!.phase).toBe("ready");
  expect(empty.state.dungeon!.explorationSetup!.provisions).toEqual([]);
  const bonus = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      heroes: game.dungeon!.heroes.map((h, i) =>
        i === 0 ? { ...h, nextQuestProvisionDice: 2 } : h,
      ),
    },
  };
  let result = applyCommand(bonus, { type: "rollDungeonProvisions" });
  expect(result.events.filter((e) => e.type === "provisionRolled")).toHaveLength(2);
  for (let i = 0; result.state.dungeon!.pending && i < 10; i++) {
    const p = result.state.dungeon!.pending!;
    result = applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: p.options[0]!.id,
    });
  }
  expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(2);
});
it.each(createLootState().available.filter((_, i) => i % 2 === 0))(
  "p010 所有箱子 $kind 替换两颗补给，Wild 检查点恢复只扣一次行动",
  (token) => {
    let game = wealdTaskBattleFixture("quest:weald:p010");
    let cursor = 0;
    while (nextProvisionFace(0, cursor) !== "wild") cursor++;
    const b = game.battle!,
      actorId = b.entities[0]!.id;
    game = {
      ...game,
      battle: {
        ...b,
        rngCursor: cursor,
        loot: { ...createLootState(), placed: [{ ...token, areaId: "a", revealed: false }] },
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "hero", actorId, actions: 2, usedSkillIds: [] },
        },
      },
    };
    let result = applyCommand(game, { type: "interactLoot", actorId });
    expect(result.pendingChoice).toBeDefined();
    expect(result.state.battle!.wealdLootFaces).toEqual([]);
    let restored = JSON.parse(JSON.stringify(result.state)) as GameState;
    for (let i = 0; result.pendingChoice && i < 3; i++) {
      const p = result.pendingChoice;
      const cmd = { type: "resolveChoice" as const, choiceId: p.id, optionId: "torch" };
      result = applyCommand(result.state, cmd);
      restored = applyCommand(restored, cmd).state;
      expect(restored).toEqual(result.state);
    }
    expect(result.state.battle!.provisions).toHaveLength(2);
    expect(result.state.battle!.loot!.gold).toBe(0);
    expect(result.state.battle!.loot!.placed).toEqual([]);
    expect(result.state.battle!.loot!.claimedIds).toEqual([token.id]);
    expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
  },
);
it("p010 返还补给每两颗1XP，上限3", () => {
  const game = applyCommand(initial(), { type: "rollDungeonProvisions" }).state;
  const exited: GameState = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      phase: "exited",
      explorationSetup: {
        ...game.dungeon!.explorationSetup!,
        provisions: Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, face: "torch" as const })),
      },
    },
  };
  const result = applyCommand(exited, { type: "summarizeDungeonQuest" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.questSummary).toMatchObject({ taskProgress: 7, xpPerHero: 3 });
});
