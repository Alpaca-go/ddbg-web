import { beforeAll, expect, it } from "vitest";
import { ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import reduceDistribution from "../../data/normalized/corebox/reduce_to_rubble_distribution.json";
import { savedCommandSchema } from "../../data/src/quest-save";
import clearDistribution from "../../data/normalized/corebox/clear_the_path_distribution.json";
import { basicQuests, questsForCampaignLevel } from "../../data/src/basic-quests";
import { dungeonQuestSummarySchema } from "../../data/src/quest-summary";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { guildQuest } from "./test-helpers/guild-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { loadQuestSave } from "./quest-save";

let baseline: ReturnType<typeof guildQuest>;
beforeAll(() => {
  // 独立seed6自然四房间回村；完整II级池实际抽到p008/p007，不注入候选或缩减牌池。
  baseline = guildQuest(coreQuestSources, 6);
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

it("seed6真实I级前缀可保存恢复；完整五张II级池按实际RNG抽到两张目标任务", () => {
  expect(baseline.start.seed).toBe(6);
  expect(baseline.game.dungeon!.gold).toBe(40);
  expect(baseline.game.dungeon!.heroes.map((hero) => [hero.dead ?? false, hero.xp])).toEqual(
    Array.from({ length: 4 }, () => [false, 2]),
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(baseline.save)), coreQuestSources).game).toEqual(
    baseline.game,
  );
  // 收束准备日是明示夹具；以下沙盒推进 / 抽选不属于正式命令存档。
  const ready = preparationReady(baseline.game);
  const advanced = ok(ready, { type: "advanceCampaignLevel" });
  const before = structuredClone(advanced);
  expect(advanced.dungeon!.discardedQuests).toEqual(
    expect.arrayContaining(questsForCampaignLevel(1).map((quest) => quest.id)),
  );
  const pool = questsForCampaignLevel(2).map((quest) => quest.id);
  expect(pool).toEqual(["quest:p006", "quest:p007", "quest:p008", "quest:p009", "quest:p010"]);
  const offered = ok(advanced, { type: "offerNextQuest" });
  expect(offered.dungeon!.nextQuestOffers).toEqual(["quest:p008", "quest:p007"]);
  expect(offered.dungeon!.pending!.options.map((option) => option.id)).toEqual(
    offered.dungeon!.nextQuestOffers,
  );
  expect(offered.dungeon!.cursor).toBe(advanced.dungeon!.cursor + pool.length - 1);
  expect(advanced).toEqual(before);
}, 30000);

it("旧修道院seed123没有抽到Clear the Path时仍原子拒绝，不补入未抽到的同级任务", () => {
  const old = naturalAbbeyQuest();
  const advanced = ok(preparationReady(old.game), { type: "advanceCampaignLevel" });
  const offered = ok(advanced, { type: "offerNextQuest" });
  expect(offered.dungeon!.nextQuestOffers).toContain("quest:p008");
  expect(offered.dungeon!.nextQuestOffers).not.toContain("quest:p007");
  const before = structuredClone(offered);
  const result = applyCommand(offered, {
    type: "resolveChoice",
    choiceId: offered.dungeon!.pending!.id,
    optionId: "quest:p007",
  });
  expect(result.state).toBe(offered);
  expect(result.events).toContainEqual({
    type: "commandRefused",
    message: "下一任务选择无效或已过期",
  });
  expect(offered).toEqual(before);
}, 30000);

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
  expect(reduceDistribution.counts.reduce((n, c) => n + c.count, 0)).toBe(8);
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
  expect(game.dungeon!.nextQuestOffers).toHaveLength(2);
  expect(
    game.dungeon!.nextQuestOffers!.every((id) =>
      basicQuests.some((q) => q.id === id && q.level === 2),
    ),
  ).toBe(true);
  expect(game.dungeon!.pending!.options).toContainEqual({
    id: "quest:p008",
    label: "Reduce to Rubble II",
  });
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
  expect(
    offered.dungeon!.nextQuestOffers?.every((id) =>
      basicQuests.some((q) => q.id === id && q.level === 1),
    ),
  ).toBe(true);
  const advanced = ok(preparationReady(baseline.game), { type: "advanceCampaignLevel" });
  expect(applyCommand(advanced, { type: "advanceCampaignLevel" }).state).toBe(advanced);
  const ii = ok(advanced, { type: "offerNextQuest" });
  expect(ii.dungeon!.nextQuestOffers).toHaveLength(2);
  expect(
    ii.dungeon!.nextQuestOffers!.every((id) =>
      basicQuests.some((q) => q.id === id && q.level === 2),
    ),
  ).toBe(true);
});
it("Clear the Path II印刷黄金表：八房含两宝藏，不套用Scout的两空房；休息8点", () => {
  const quest = basicQuests.find((q) => q.id === "quest:p007")!;
  expect(quest).toMatchObject({
    name: "Clear the Path II",
    level: 2,
    restPoints: 8,
    xpKind: "all",
    roomsPerXp: 2,
    maxRooms: 6,
  });
  expect(clearDistribution.counts).toEqual([
    { kind: "dark", count: 1 },
    { kind: "curio", count: 2 },
    { kind: "treasure", count: 2 },
    { kind: "lair", count: 2 },
    { kind: "trap", count: 1 },
  ]);
});
function embarkII(questId: "quest:p007" | "quest:p008") {
  const ready = preparationReady(baseline.game);
  const advanced = ok(ready, { type: "advanceCampaignLevel" });
  const offered = ok(advanced, { type: "offerNextQuest" });
  const choice: Command = {
    type: "resolveChoice",
    choiceId: offered.dungeon!.pending!.id,
    optionId: questId,
  };
  return { ready, offered, choice, embarked: ok(offered, choice) };
}
it("II级两张抽选后只出征Clear the Path，另一张永久弃置；过期/越级选择拒绝，原命令回放", () => {
  const { ready, offered, choice, embarked } = embarkII("quest:p007");
  expect(offered.dungeon!.pending!.options).toHaveLength(2);
  expect(embarked.dungeon!.questDistribution).toEqual(clearDistribution);
  expect(embarked.dungeon!.rooms.filter((r) => r.kind === "treasure")).toHaveLength(2);
  expect(embarked.dungeon!.rooms.some((r) => r.kind === "empty")).toBe(false);
  expect(embarked.dungeon!.rest).toEqual({ questId: "quest:p007", used: false });
  expect(embarked.dungeon!.discardedQuests).toContain("quest:p008");
  expect(embarked.dungeon!.discardedQuests).not.toContain("quest:p007");
  expect(applyCommand(embarked, choice).state).toBe(embarked);
  expect(applyCommand(offered, { ...choice, optionId: "quest:p001" }).state).toBe(offered);
  expect(
    ok(ok(ok(ready, { type: "advanceCampaignLevel" }), { type: "offerNextQuest" }), choice),
  ).toEqual(embarked);
});
it("两张II级任务摘要覆盖0到印刷上限：宝藏计房间XP，暗房/陷阱不能清理，不提前实发XP", () => {
  for (const questId of ["quest:p007", "quest:p008"] as const) {
    const { embarked } = embarkII(questId),
      d = embarked.dungeon!;
    const countable = d.rooms.filter((r) =>
      questId === "quest:p007" ? !["dark", "trap"].includes(r.kind) : r.kind === "lair",
    );
    for (let count = 0; count <= countable.length; count++) {
      const ids = countable.slice(0, count).map((r) => r.id);
      // 明确奖励边界夹具，非II级怪物战斗或自然升幕验收。
      const exited: GameState = {
        ...embarked,
        dungeon: {
          ...d,
          phase: "exited",
          rooms: d.rooms.map((r) =>
            ids.includes(r.id) ? { ...r, revealed: true, cleared: true } : r,
          ),
        },
      };
      const before = structuredClone(exited);
      const result = applyCommand(exited, { type: "summarizeDungeonQuest" });
      const summary = result.state.dungeon!.questSummary!;
      expect(summary).toMatchObject({
        questId,
        xpPerHero: questId === "quest:p007" ? Math.floor(count / 2) : count,
        awarded: false,
      });
      expect(summary.clearedRoomIds).toHaveLength(count);
      expect(dungeonQuestSummarySchema.safeParse(summary).success).toBe(true);
      expect(result.state.dungeon!.heroes).toEqual(d.heroes);
      expect(result.state.dungeon!.gold).toBe(d.gold);
      expect(applyCommand(result.state, { type: "summarizeDungeonQuest" }).state).toBe(
        result.state,
      );
      expect(exited).toEqual(before);
      for (const changed of [
        { ...summary, name: "Scout Ahead I" },
        { ...summary, xpPerHero: 4 },
        { ...summary, clearedRoomIds: ["A", "A"] },
      ])
        expect(dungeonQuestSummarySchema.safeParse(changed).success).toBe(false);
    }
    for (const room of d.rooms.filter((r) => ["dark", "trap"].includes(r.kind))) {
      const invalid: GameState = {
        ...embarked,
        dungeon: {
          ...d,
          phase: "exited",
          rooms: d.rooms.map((r) =>
            r.id === room.id ? { ...r, revealed: true, cleared: true } : r,
          ),
        },
      };
      expect(applyCommand(invalid, { type: "summarizeDungeonQuest" }).state).toBe(invalid);
    }
  }
});
it("升幕预览不纳入正式存档；坏饰品分区/重复怪物/缩减目录不能借升幕修复", () => {
  expect(savedCommandSchema.safeParse({ type: "advanceCampaignLevel" }).success).toBe(false);
  const ready = preparationReady(baseline.game),
    d = ready.dungeon!;
  const first = d.monsterPool!.remaining?.[0] ?? "monster-deck:p001";
  for (const changed of [
    { ...ready, dungeon: { ...d, trinkets: { ...d.trinkets!, deck: [] } } },
    { ...ready, dungeon: { ...d, monsterPool: { ...d.monsterPool!, remaining: [first, first] } } },
    {
      ...ready,
      dungeon: { ...d, monsterPool: { ...d.monsterPool!, cards: d.monsterPool!.cards.slice(1) } },
    },
  ]) {
    const before = structuredClone(changed),
      result = applyCommand(changed, { type: "advanceCampaignLevel" });
    expect(result.state).toBe(changed);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(changed).toEqual(before);
  }
});
