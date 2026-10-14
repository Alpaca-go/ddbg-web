import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/fundraiser_distribution.json";
import { createDungeonSandbox } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { canLeaveDungeon } from "./dungeon-exit";
import { dungeonQuestSummarySchema } from "../../data/src/quest-summary";

function setup(gold = 80, cleared = true): GameState {
  const s = createDungeonSandbox(1, layout, distribution);
  const lair = s.dungeon!.rooms.find((r) => r.kind === "lair")!.id;
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      gold,
      position: lair,
      rooms: s.dungeon!.rooms.map((r) => (r.id === lair ? { ...r, revealed: true, cleared } : r)),
    },
  };
}
const pick = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
function pending(gold = 80) {
  let s = applyCommand(setup(gold), { type: "leaveDungeon" }).state;
  s = pick(s, "agree").state;
  return applyCommand(s, { type: "summarizeDungeonQuest" }).state;
}
describe("Fundraiser捐献（QUEST p3、R29、R-038、R-068）", () => {
  it.each([0, 1, 19, 20, 39, 40, 59, 60])(
    "明确捐献%i金币才扣除，整20得XP，英雄 / 驿站同额待发",
    (gold) => {
      const s = pending(),
        before = structuredClone(s);
      const result = pick(s, `give:${gold}`);
      const xp = Math.floor(gold / 20);
      expect(result.state.dungeon!.gold).toBe(80 - gold);
      expect(result.state.dungeon!.questSummary).toMatchObject({
        questId: "quest:p003",
        donatedGold: gold,
        earlyLeave: false,
        objectiveMet: true,
        lairClearedCount: 1,
        xpPerHero: xp,
        stagecoachXp: xp,
        awarded: false,
      });
      expect(dungeonQuestSummarySchema.safeParse(result.state.dungeon!.questSummary).success).toBe(
        true,
      );
      expect(result.state.dungeon!.heroes).toEqual(s.dungeon!.heroes);
      expect(result.state.dungeon!.cursor).toBe(s.dungeon!.cursor);
      expect(s).toEqual(before);
      expect(
        applyCommand(result.state, {
          type: "resolveChoice",
          choiceId: s.dungeon!.pending!.id,
          optionId: `give:${gold}`,
        }).state,
      ).toBe(result.state);
      expect(applyCommand(result.state, { type: "summarizeDungeonQuest" }).state).toBe(
        result.state,
      );
    },
  );
  it("取消不扣费；重新提出后陈旧决定拒绝，待选冻结其他命令", () => {
    const p = pending();
    const cancelled = pick(p, "cancel").state;
    expect(cancelled.dungeon!.gold).toBe(80);
    expect(cancelled.dungeon!.questSummary).toBeUndefined();
    const next = applyCommand(cancelled, { type: "summarizeDungeonQuest" }).state;
    expect(
      applyCommand(next, {
        type: "resolveChoice",
        choiceId: p.dungeon!.pending!.id,
        optionId: "give:20",
      }).state,
    ).toBe(next);
    for (const command of [
      { type: "restDungeon" },
      { type: "leaveDungeon" },
      { type: "summarizeDungeonQuest" },
    ] as Command[])
      expect(applyCommand(next, command).state).toBe(next);
  });
  it("可用金币限制、60上限与非法 / 伪造金额不绕过，支持非整20金额", () => {
    const s = pending(25);
    expect(s.dungeon!.pending!.options).toHaveLength(27);
    for (const value of ["give:-1", "give:1.5", "give:26", "give:61", "give:NaN", "give:020"])
      expect(pick(s, value).state).toBe(s);
    const forged = {
      ...s,
      dungeon: {
        ...s.dungeon!,
        pending: {
          ...s.dungeon!.pending!,
          options: [...s.dungeon!.pending!.options, { id: "give:61", label: "fake" }],
        },
      },
    };
    expect(pick(forged, "give:61").state).toBe(forged);
    expect(pending().dungeon!.pending!.options.some((o) => o.id === "give:61")).toBe(false);
  });

  it("最低巢穴目标未达仍可全员提前退出，摘要跳过捐献、不扣金币（R-068）", () => {
    const original = setup(80, false);
    const state = { ...original, dungeon: { ...original.dungeon!, position: "S" } };
    const before = structuredClone(state);
    expect(canLeaveDungeon(state)).toBe(true);
    const leave = applyCommand(state, { type: "leaveDungeon" }).state;
    expect(pick(leave, "decline").state.dungeon!.phase).toBe("ready");
    const exited = pick(leave, "agree").state;
    const result = applyCommand(exited, { type: "summarizeDungeonQuest" });
    expect(result.state.dungeon!.questSummary).toMatchObject({
      earlyLeave: true,
      objectiveMet: false,
      lairClearedCount: 0,
      donatedGold: 0,
      xpPerHero: 0,
    });
    expect(result.state.dungeon!.gold).toBe(80);
    expect(result.state.dungeon!.pending).toBeNull();
    expect(result.state.dungeon!.heroes).toEqual(state.dungeon!.heroes);
    expect(result.state.dungeon!.cursor).toBe(state.dungeon!.cursor);
    expect(dungeonQuestSummarySchema.safeParse(result.state.dungeon!.questSummary).success).toBe(
      true,
    );
    expect(applyCommand(result.state, { type: "summarizeDungeonQuest" }).state).toBe(result.state);
    const falseGoal = { ...result.state.dungeon!.questSummary!, objectiveMet: true };
    expect(dungeonQuestSummarySchema.safeParse(falseGoal).success).toBe(false);
    const falseDonation = {
      ...result.state.dungeon!.questSummary!,
      donatedGold: 20,
      xpPerHero: 1,
      stagecoachXp: 1,
    };
    expect(dungeonQuestSummarySchema.safeParse(falseDonation).success).toBe(false);
    expect(state).toEqual(before);
    expect(applyCommand(exited, { type: "summarizeDungeonQuest" })).toEqual(result);
  });
  it("选择后目标 / 金币漂移，schema坏摘要原子拒绝；同日志回放一致", () => {
    const s = pending();
    for (const gold of [-1, 1.5, 10]) {
      const bad = { ...s, dungeon: { ...s.dungeon!, gold } };
      expect(pick(bad, "give:20").state).toBe(bad);
    }
    const noGoal = {
      ...s,
      dungeon: { ...s.dungeon!, rooms: s.dungeon!.rooms.map((r) => ({ ...r, cleared: false })) },
    };
    expect(pick(noGoal, "give:20").state).toBe(noGoal);
    const good = pick(s, "give:20").state.dungeon!.questSummary!;
    for (const bad of [
      { ...good, donatedGold: 60 },
      { ...good, clearedRoomIds: [] },
    ])
      expect(dungeonQuestSummarySchema.safeParse(bad).success).toBe(false);
    expect(dungeonQuestSummarySchema.safeParse({ ...good, awarded: true }).success).toBe(true);
    const commands: Command[] = [
      { type: "leaveDungeon" },
      { type: "resolveChoice", choiceId: "dungeon-exit:0", optionId: "agree" },
      { type: "summarizeDungeonQuest" },
      { type: "resolveChoice", choiceId: "dungeon-fundraiser:1", optionId: "give:40" },
    ];
    const replay = () => commands.reduce((s, c) => applyCommand(s, c).state, setup());
    expect(replay()).toEqual(replay());
    expect(replay().dungeon!.questSummary!.xpPerHero).toBe(2);
  });
});
