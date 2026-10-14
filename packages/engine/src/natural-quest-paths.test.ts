import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { naturalQuest } from "./test-helpers/natural-quest";
import { coreQuestSources } from "./test-helpers/core-quest";

it.each([
  ["quest:p001", 1, ["B", "E", "G"], 15, ["victory"]],
  ["quest:p002", 1, ["E"], 15, ["victory"]],
  ["quest:p003", 3, ["B"], 5, ["retreat", "victory"]],
] as const)(
  "%s seed%i：真实起点→探索/战斗/休息/返回→离开摘要，完整池及命令回放",
  (questId, seed, cleared, gold, outcomes) => {
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
    if (questId !== "quest:p003")
      expect(run.commands.some((c) => c.type === "beginDungeonBacktrack")).toBe(true);
    expect(
      run.commands.some((c) => c.type === "playHeroSkill" || c.type === "playHeroSkillTargets"),
    ).toBe(true);
    expect(run.commands.some((c) => c.type === "playMonsterSkill")).toBe(true);
    expect(run.initial.dungeon).toMatchObject({
      position: "S",
      phase: "awaitingProvisions",
      gold: 0,
    });
    expect(run.initial.dungeon!.rooms.every((r) => !r.revealed && !r.cleared)).toBe(true);
    expect(d.monsterPool!.remaining).toHaveLength(42);
    expect(d.monsterPool!.active).toBeNull();
    expect([...(d.roomCards!.deck ?? []), ...(d.roomCards!.discard ?? [])]).toHaveLength(9);
    expect([...(d.curio!.deck ?? []), ...d.curio!.discard]).toHaveLength(24);
    expect(run.commands.reduce<GameState>((s, c) => applyCommand(s, c).state, run.initial)).toEqual(
      run.state,
    );
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
      ]);
    }
  },
  20000,
);
it("Fundraiser seed1：真实命令导致英雄死亡，保留状态／金币，等待替换而不伪造成功摘要", () => {
  const run = naturalQuest(1, "quest:p003", true),
    d = run.state.dungeon!;
  expect(run.stopReason).toBe("dungeon halted awaitingReplacement");
  expect(d.phase).toBe("awaitingReplacement");
  expect(d.heroes.filter((h) => h.dead).map((h) => h.id)).toEqual(["hero-0"]);
  expect(d.questSummary).toBeUndefined();
  expect(d.gold).toBe(15);
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
  const run = naturalQuest(3, "quest:p003");
  let s = run.initial;
  for (const c of run.commands) {
    s = applyCommand(s, c).state;
    if (
      s.dungeon!.phase === "ready" &&
      s.dungeon!.position === "G" &&
      s.dungeon!.rooms.find((r) => r.id === "G")!.cleared
    )
      break;
  }
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
