import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { nextNaturalRoute } from "./test-helpers/natural-route";
import { coreQuestSources } from "./test-helpers/core-quest";
import { allRuinsRoomCardIds } from "./dungeon-objective";

it.each([
  ["quest:p001", 1, ["B", "E", "G"], 35, ["victory"], false],
  ["quest:p002", 1, ["E"], 35, ["victory"], false],
  ["quest:p003", 3, ["B"], 40, ["victory"], true],
  ["quest:p004", 1, ["G"], 30, ["victory"], false],
  ["quest:p005", 1, ["E"], 35, ["victory"], false],
] as const)(
  "%s seed%i：真实起点→探索/战斗/休息/返回→离开摘要，完整池及命令回放",
  (questId, seed, cleared, gold, outcomes, backtracked) => {
    const before = structuredClone(coreQuestSources),
      run = naturalQuest(seed, questId),
      d = run.state.dungeon!;
    expect(run.stopReason).toBeNull();
    expect(d.phase).toBe("exited");
    expect(d.heroes.every((h) => !h.dead)).toBe(true);
    expect(d.questSummary).toMatchObject({
      questId,
      clearedRoomIds: cleared,
      xpPerHero: 1,
      stagecoachXp: 1,
      awarded: false,
    });
    expect(d.gold).toBe(gold);
    expect(d.rest!.used).toBe(true);
    expect(
      run.events.flatMap((e) => (e.type === "battleFinished" && "outcome" in e ? [e.outcome] : [])),
    ).toEqual(outcomes);
    expect(run.commands.some((c) => c.type === "beginDungeonBacktrack")).toBe(backtracked);
    if (questId === "quest:p004") {
      expect(d.setAsideRoomCardId).toBe("room:p007");
      expect(run.commands.some((c) => c.type === "resolveDungeonRoom")).toBe(true);
      expect(
        run.commands.filter(
          (c) => c.type === "resolveChoice" && c.choiceId.startsWith("dungeon-objective-recover:"),
        ).length,
      ).toBe(2);
    }
    expect(
      run.commands.some((c) => c.type === "playHeroSkill" || c.type === "playHeroSkillTargets"),
    ).toBe(true);
    expect(run.commands.some((c) => c.type === "playMonsterSkill")).toBe(true);
    expect(run.initial.dungeon).toMatchObject({
      position: "S",
      phase: "awaitingProvisions",
      gold: 20,
    });
    expect(run.initial.dungeon!.rooms.every((r) => !r.revealed && !r.cleared)).toBe(true);
    expect(d.monsterPool!.remaining).toHaveLength(42);
    expect(d.monsterPool!.active).toBeNull();
    if (questId === "quest:p004") expect(allRuinsRoomCardIds(d)).toHaveLength(9);
    else expect([...(d.roomCards!.deck ?? []), ...(d.roomCards!.discard ?? [])]).toHaveLength(9);
    expect([...(d.curio!.deck ?? []), ...d.curio!.discard]).toHaveLength(24);
    expect(
      run.commands.reduce<GameState>((s, c) => {
        if (
          c.type === "resolveChoice" &&
          (c.choiceId.startsWith("dungeon-route:") || c.choiceId.startsWith("dungeon-backtrack:"))
        ) {
          expect(s.dungeon!.pending!.options.map((o) => o.id)).toContain(c.optionId);
        }
        const result = applyCommand(s, c);
        expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
        return result.state;
      }, run.initial),
    ).toEqual(run.state);
    expect(coreQuestSources).toEqual(before);
    expect(applyCommand(run.state, { type: "summarizeDungeonQuest" }).state).toBe(run.state);
    if (questId === "quest:p002")
      expect(
        d.rooms
          .filter((r) => r.cleared)
          .map((r) => r.id)
          .sort(),
      ).toEqual(["B", "E", "G"]);
    if (questId === "quest:p003") {
      expect(d.questSummary).toMatchObject({
        objectiveMet: true,
        earlyLeave: false,
        lairClearedCount: 1,
        donatedGold: 20,
      });
      expect(d.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
      expect(
        run.events.filter((e) => e.message.includes("Fundraiser巢穴奖励 +10 金币")),
      ).toHaveLength(1);
      expect(
        run.events.filter((e) => e.message.includes("Curio：金币 +")).map((e) => e.message),
      ).toEqual([
        "hero-0 Curio：金币 +10（印刷行序，R-069）",
        "hero-2 Curio：金币 +5（印刷行序，R-069）",
        "hero-0 Curio：金币 +5（印刷行序，R-069）",
        "hero-2 Curio：金币 +10（印刷行序，R-069）",
      ]);
    }
  },
  20000,
);
it("Scout Ahead seed87：没有可用攻击时仍可合法移动，真实死亡停点可回放", () => {
  const run = naturalQuest(87, "quest:p001", true);
  expect(run.stopReason).toBe("dungeon halted awaitingReplacement");
  expect(run.commands.some((c) => c.type === "moveHero" && c.actorId === "hero-3")).toBe(true);
  expect(run.state.dungeon!.heroes.some((h) => h.dead)).toBe(true);
  expect(run.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(run.commands.reduce<GameState>((s, c) => applyCommand(s, c).state, run.initial)).toEqual(
    run.state,
  );
});
it("Fundraiser seed1：真实命令导致英雄死亡，保留状态／金币，等待替换而不伪造成功摘要", () => {
  const run = naturalQuest(1, "quest:p003", true),
    d = run.state.dungeon!;
  expect(run.stopReason).toBe("dungeon halted awaitingReplacement");
  expect(d.phase).toBe("awaitingReplacement");
  expect(d.heroes.filter((h) => h.dead).map((h) => h.id)).toEqual(["hero-0"]);
  expect(d.questSummary).toBeUndefined();
  expect(d.gold).toBe(35);
  expect(run.commands.reduce<GameState>((s, c) => applyCommand(s, c).state, run.initial)).toEqual(
    run.state,
  );
  for (const command of [
    { type: "leaveDungeon" },
    { type: "summarizeDungeonQuest" },
    { type: "beginDungeonExploration" },
  ] as const)
    expect(applyCommand(run.state, command).state).toBe(run.state);
}, 20000);
it("Fundraiser从真实首个Empty提前离开：0巢穴不失败、不开放捐献、不给XP", () => {
  // 选择首个实际相邻节点为 Empty 的种子，不固定旧图的 G，不注入房间或牌序。
  const seed = Array.from({ length: 24 }, (_, i) => i + 1).find((candidate) => {
    const d = createCoreDungeonQuest(
      candidate,
      "quest:p003",
      "radiant",
      naturalParty,
      coreQuestSources,
    ).dungeon!;
    return d.rooms.some((r) => r.id === nextNaturalRoute(d)?.to && r.kind === "empty");
  });
  expect(seed).toBeDefined();
  const run = naturalQuest(seed!, "quest:p003", true, coreQuestSources, 2, {
    observe: (state) => {
      if (
        state.dungeon!.phase === "ready" &&
        state.dungeon!.rooms.some(
          (r) => r.id === state.dungeon!.position && r.kind === "empty" && r.cleared,
        )
      )
        throw new Error("observed-empty");
    },
  });
  expect(run.stopReason).toBe("observed-empty");
  let s = run.state;
  expect(
    run.commands.reduce<GameState>((state, c) => applyCommand(state, c).state, run.initial),
  ).toEqual(s);
  expect(s.dungeon!.rooms.some((r) => r.kind === "lair" && r.cleared)).toBe(false);
  s = applyCommand(s, { type: "leaveDungeon" }).state;
  s = applyCommand(s, {
    type: "resolveChoice",
    choiceId: s.dungeon!.pending!.id,
    optionId: "agree",
  }).state;
  const gold = s.dungeon!.gold,
    result = applyCommand(s, { type: "summarizeDungeonQuest" });
  expect(result.state.dungeon!.questSummary).toMatchObject({
    objectiveMet: false,
    earlyLeave: true,
    lairClearedCount: 0,
    donatedGold: 0,
    xpPerHero: 0,
    awarded: false,
  });
  expect(result.pendingChoice).toBeUndefined();
  expect(result.state.dungeon!.gold).toBe(gold);
}, 20000);
