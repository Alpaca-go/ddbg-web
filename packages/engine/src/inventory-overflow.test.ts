import { expect, it } from "vitest";
import { applyCommand, type GameState, type ApplyResult, type Command } from "./command";
import { wealdSuppliesLootFixture, wealdTaskSources } from "./test-helpers/weald-task-battle";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
const ok = (state: GameState, command: Command) => {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
};
function chooseFaces(result: ApplyResult) {
  const rolled = [...result.events];
  for (let i = 0; result.pendingChoice && !result.state.inventoryOverflowHold && i < 50; i++) {
    const p = result.pendingChoice;
    result = ok(result.state, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: p.options[0]!.id,
    });
    rolled.push(...result.events);
  }
  return { result, rolled };
}
it.each([15, 16])(
  "Lost Supplies 已有%s颗仍掷足两次，从新旧补给选弃至16，JSON续接不重领",
  (count) => {
    const initial = wealdSuppliesLootFixture(),
      b = initial.battle!,
      actorId = b.entities[0]!.id;
    const game = {
      ...initial,
      battle: {
        ...b,
        provisions: Array.from({ length: count }, (_, i) => ({
          id: `old:${i}`,
          face: "food" as const,
        })),
      },
    };
    const obtained = chooseFaces(
      ok(game, { type: "interactLoot", actorId, inventoryOverflow: true }),
    );
    let result = obtained.result;
    expect(obtained.rolled.filter((e) => e.type === "provisionRolled")).toHaveLength(2);
    expect(result.state.battle!.provisions).toHaveLength(count + 2);
    expect(result.state.battle!.loot!.placed).toEqual([]);
    expect(result.state.battle!.loot!.claimedIds).toHaveLength(1);
    expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
    expect(result.pendingChoice!.options.some((o) => o.id.startsWith("loot-provision:"))).toBe(
      true,
    );
    const held = result.state;
    expect(applyCommand(held, { type: "drawInitiative" }).state).toBe(held);
    const cursor = held.battle!.rngCursor;
    for (let i = 0; result.state.inventoryOverflowHold && i < 4; i++) {
      const p = result.pendingChoice!,
        optionId =
          i === 0
            ? p.options.find((o) => o.id.startsWith("loot-provision:"))!.id
            : p.options[0]!.id;
      const cmd = { type: "resolveChoice" as const, choiceId: p.id, optionId };
      const checkpoint = JSON.parse(JSON.stringify(result.state)) as GameState;
      result = ok(result.state, cmd);
      expect(applyCommand(checkpoint, cmd)).toEqual(result);
    }
    expect(result.state.battle!.provisions).toHaveLength(16);
    expect(result.state.battle!.rngCursor).toBe(cursor);
    expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
    expect(game.inventoryOverflow).toBeUndefined();
  },
);
it("最后一个行动拾取，先弃超额再结束英雄回合", () => {
  const game = wealdSuppliesLootFixture(),
    b = game.battle!,
    actorId = b.entities[0]!.id;
  const turn = b.encounter!.turn;
  if (turn.type !== "hero") throw new Error("hero fixture");
  let result = chooseFaces(
    ok(
      {
        ...game,
        battle: {
          ...b,
          provisions: Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, face: "tool" })),
          encounter: { ...b.encounter!, turn: { ...turn, actions: 1 } },
        },
      },
      { type: "interactLoot", actorId, inventoryOverflow: true },
    ),
  ).result;
  expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 0 });
  for (let i = 0; result.state.inventoryOverflowHold && i < 4; i++) {
    const p = result.pendingChoice!;
    result = ok(result.state, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: p.options[0]!.id,
    });
  }
  expect(result.state.inventoryOverflowTurn).toBeUndefined();
  expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
});
it("非Weald任务奖励骰全部掷完，先选齐Wild再从22颗弃至16", () => {
  let game = createCoreDungeonQuest(0, "quest:p001", "radiant", coreParty, coreQuestSources);
  game = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      nextQuestPartyProvisionDice: 2,
      heroes: game.dungeon!.heroes.map((h, i) =>
        i === 0 ? { ...h, nextQuestProvisionDice: 12 } : h,
      ),
    },
  };
  const obtained = chooseFaces(
    ok(game, { type: "rollDungeonProvisions", inventoryOverflow: true }),
  );
  let result = obtained.result;
  expect(obtained.rolled.filter((e) => e.type === "provisionRolled")).toHaveLength(18);
  expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(22);
  expect(result.state.inventoryOverflowHold?.resume.type).toBe("questProvisionFlow");
  for (let i = 0; result.state.inventoryOverflowHold && i < 8; i++) {
    const p = result.pendingChoice!;
    result = ok(result.state, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: p.options[0]!.id,
    });
  }
  expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(16);
  expect(result.state.dungeon!.phase).toBe("ready");
});
it("新标记进入完整初始日志，旧日志不自动改变容量规则", () => {
  const initial = createCoreDungeonQuest(
    0,
    "quest:weald:p010",
    "radiant",
    naturalParty,
    wealdTaskSources,
    true,
    "full",
    ["core", "weald"],
    undefined,
    undefined,
    "tasks-v1",
  );
  const first = { type: "rollDungeonProvisions" as const, inventoryOverflow: true as const };
  const ready = ok(initial, first).state;
  const run = naturalQuest(0, "quest:weald:p010", true, wealdTaskSources, 2, {
    continueFrom: ready,
    exitAfterBattles: 1,
    toxicMushrooms: true,
    wealdUnprepared: true,
    wealdPrecious: true,
    wealdAbyssalPuff: true,
    wealdClearing: true,
    wealdOurs: true,
  });
  const start = {
    seed: 0,
    questId: "quest:weald:p010" as const,
    mode: "radiant" as const,
    party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: ["core" as const, "weald" as const],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    wealdHigherQuestOffers: "tasks-v1" as const,
  };
  const save = createQuestSave(start, [first, ...run.commands], run.state, wealdTaskSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), wealdTaskSources).game).toEqual(run.state);
  expect(() =>
    loadQuestSave(
      {
        ...save,
        commands: save.commands.map((c, i) => (i === 0 ? { type: "rollDungeonProvisions" } : c)),
      },
      wealdTaskSources,
    ),
  ).toThrow();
  const old = wealdSuppliesLootFixture();
  const full = {
    ...old,
    battle: {
      ...old.battle!,
      provisions: Array.from({ length: 16 }, (_, i) => ({ id: `old${i}`, face: "tool" as const })),
    },
  };
  expect(
    applyCommand(full, { type: "interactLoot", actorId: old.battle!.entities[0]!.id }).state,
  ).toBe(full);
}, 60000);
