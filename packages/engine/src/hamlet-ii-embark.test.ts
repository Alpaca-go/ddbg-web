import { beforeAll, expect, it } from "vitest";
import { ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import reduceDistribution from "../../data/normalized/corebox/reduce_to_rubble_distribution.json";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

/** 明示准备结束夹具：不改金币/牌序/持牌，只收束到可推进/出征。 */
function preparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

it("Reduce to Rubble II 房间构成与 I 级已核对图标映射一致（R-038 / R-048）", () => {
  expect(reduceDistribution).toEqual({
    questId: "quest:p008",
    source: expect.stringContaining("p8"),
    counts: [
      { kind: "dark", count: 1 },
      { kind: "curio", count: 2 },
      { kind: "lair", count: 3 },
      { kind: "trap", count: 2 },
    ],
  });
  expect(
    reduceDistribution.counts.reduce((n, c) => n + c.count, 0),
  ).toBe(8);
});

it("战役等级 I→II：移出 I 级任务堆、累加 II 级怪物、地牢饰品切 II，并可出征 Reduce to Rubble（§2.2 / R35 / R-037）", () => {
  let game = preparationReady(baseline.game);
  const embarkCommands: Command[] = [];
  const step = (c: Command) => {
    embarkCommands.push(c);
    game = ok(game, c);
  };
  const beforeCursor = game.dungeon!.cursor;
  const heldBefore = game.dungeon!.trinkets!.held.length;
  step({ type: "advanceCampaignLevel" });
  expect(game.dungeon!.campaignLevel).toBe(2);
  expect(game.dungeon!.explorationSetup!.dungeonLevel).toBe(2);
  expect(game.dungeon!.trinkets!.level).toBe(2);
  expect(game.dungeon!.trinkets!.held.length).toBe(heldBefore);
  expect(game.dungeon!.discardedQuests).toEqual(
    expect.arrayContaining(["quest:p001", "quest:p002", "quest:p003"]),
  );
  expect(game.dungeon!.monsterPool!.remaining).toHaveLength(
    ruinsMonsterPoolThrough(game.dungeon!.monsterPool!.cards, 2).length,
  );
  expect(game.dungeon!.cursor).toBeGreaterThan(beforeCursor);
  expect(applyCommand(game, { type: "advanceCampaignLevel" }).state).toBe(game);

  step({ type: "offerNextQuest" });
  expect(game.dungeon!.nextQuestOffers).toEqual(["quest:p008"]);
  expect(game.dungeon!.pending!.options).toEqual([
    { id: "quest:p008", label: "Reduce to Rubble II" },
  ]);
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "quest:p008",
  });
  expect(game.dungeon!.phase).toBe("awaitingProvisions");
  expect(game.dungeon!.campaignLevel).toBe(2);
  expect(game.dungeon!.explorationSetup!.dungeonLevel).toBe(2);
  expect(game.dungeon!.questDistribution!.questId).toBe("quest:p008");
  expect(game.dungeon!.trinkets!.level).toBe(2);
  expect(game.dungeon!.rooms.filter((r) => r.kind === "lair")).toHaveLength(3);
  expect(game.dungeon!.rooms.filter((r) => r.kind === "curio")).toHaveLength(2);
  expect(game.dungeon!.discardedQuests).toContain("quest:p003");
  expect(game.dungeon!.discardedQuests).not.toContain("quest:p008");

  // 准备结束夹具不在命令日志内；同种子从同一夹具状态回放推进/出征命令。
  let replayed = preparationReady(baseline.game);
  for (const c of embarkCommands) replayed = ok(replayed, c);
  expect(replayed).toEqual(game);
});

it("未推进战役等级时不能抽到 II 级任务；已在 II 级时拒绝再次推进", () => {
  const ready = preparationReady(baseline.game);
  const offered = ok(ready, { type: "offerNextQuest" });
  expect(offered.dungeon!.nextQuestOffers?.every((id) => id !== "quest:p008")).toBe(true);
  const advanced = ok(preparationReady(baseline.game), { type: "advanceCampaignLevel" });
  expect(applyCommand(advanced, { type: "advanceCampaignLevel" }).state).toBe(advanced);
  const ii = ok(advanced, { type: "offerNextQuest" });
  expect(ii.dungeon!.nextQuestOffers).toEqual(["quest:p008"]);
});
