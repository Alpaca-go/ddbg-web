import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import wipe from "../../data/normalized/corebox/wipe_em_out_distribution.json";
import scout from "../../data/normalized/corebox/scout_ahead_distribution.json";
import stats from "../../data/normalized/corebox/hero_stat.json";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { readBasicQuest } from "../../data/src/basic-quests";
import { dungeonQuestSummarySchema } from "../../data/src/quest-summary";
import { scoutRestSchema } from "../../data/src/scout-rest";

function setup(count = 0): GameState {
  const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
    const stat = stats.cards.find((s) => s.name === name && s.level === 1)!;
    return {
      id: `hero-${i}`,
      level: 1,
      life: stat.life,
      attributesVerified: stat.attributesVerified,
      wounds: 3,
      stress: 4,
    };
  });
  const base = createDungeonSandbox(1885, layout, wipe, "standard", "S", heroes, [], {
    dungeonLevel: 1,
    light: 5,
    provisions: [],
  });
  const lairs = base
    .dungeon!.rooms.filter((r) => r.kind === "lair")
    .slice(0, count)
    .map((r) => r.id);
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      position: base.dungeon!.rooms.find((r) => r.kind === "empty")!.id,
      rooms: base.dungeon!.rooms.map((r) => ({
        ...r,
        revealed: true,
        ...(r.kind === "empty" || lairs.includes(r.id) ? { cleared: true } : {}),
      })),
    },
  };
}
const pick = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId }).state;
const exit = (s: GameState) => pick(applyCommand(s, { type: "leaveDungeon" }).state, "agree");
const summary = (s: GameState) => applyCommand(s, { type: "summarizeDungeonQuest" });

describe("Wipe ‘Em Out I（QUEST p2、R15、R29、R-038）", () => {
  it.each([0, 1, 2, 3])("清理%i间巢穴：只按巢穴得XP，两个Empty不计分", (count) => {
    const state = exit(setup(count)),
      before = structuredClone(state);
    const result = summary(state);
    expect(result.state.dungeon!.questSummary).toMatchObject({
      questId: "quest:p002",
      name: "Wipe ‘Em Out I",
      xpPerHero: count,
      stagecoachXp: count,
      awarded: false,
    });
    expect(result.state.dungeon!.questSummary!.clearedRoomIds).toHaveLength(count);
    expect(dungeonQuestSummarySchema.safeParse(result.state.dungeon!.questSummary).success).toBe(
      true,
    );
    expect(result.state.dungeon!.heroes).toEqual(state.dungeon!.heroes);
    expect(result.state.dungeon!.cursor).toBe(state.dungeon!.cursor);
    expect(state).toEqual(before);
    expect(summary(result.state).state).toBe(result.state);
  });
  it("完整八枚、真实种子分布与共享RNG；缺失 / 错身份 / 改构成拒绝，不兜底", () => {
    const base = setup();
    expect(base).toEqual(setup());
    expect(base.dungeon!.cursor).toBe(7);
    expect(base.dungeon!.rooms.filter((r) => r.kind === "lair")).toHaveLength(3);
    expect(base.dungeon!.rooms.some((r) => r.kind === "curio")).toBe(false);
    for (const input of [
      { ...wipe, questId: "quest:p003" },
      { ...scout, questId: "quest:p002" },
      { ...wipe, counts: wipe.counts.slice(1) },
    ])
      expect(readBasicQuest(input)).toBeNull();
    const wrong = {
      ...exit(base),
      dungeon: {
        ...exit(base).dungeon!,
        questDistribution: createDungeonSandbox(1, layout, scout).dungeon!.questDistribution!,
      },
    };
    expect(summary(wrong).state).toBe(wrong);
  });
  it("12点均分每人3点，第12点才恢复和弃柴火，0到3XP不被休息改变", () => {
    const base = setup(1);
    let s = pick(applyCommand(base, { type: "restDungeon" }).state, "equal");
    for (let i = 0; i < 12; i++) {
      expect(s.dungeon!.pending!.actorId).toBe(`hero-${Math.floor(i / 3)}`);
      const next = pick(s, `heal:${Math.floor(i / 3)}`);
      if (i < 11) {
        expect(next.dungeon!.heroes).toEqual(base.dungeon!.heroes);
        expect(next.dungeon!.rest!.used).toBe(false);
      }
      s = next;
    }
    expect(s.dungeon!.heroes.every((h) => h.wounds === 0 && h.stress === 4)).toBe(true);
    expect(s.dungeon!.rest!.used).toBe(true);
    expect(scoutRestSchema.safeParse(s.dungeon!.rest).success).toBe(true);
    expect(summary(exit(s)).state.dungeon!.questSummary!.xpPerHero).toBe(1);
    const bad = {
      ...base,
      dungeon: { ...base.dungeon!, rest: { questId: "quest:p001" as const, used: false } },
    };
    expect(applyCommand(bad, { type: "restDungeon" }).state).toBe(bad);
  });
  it("未知ID / 混名 / 非整数XP / 重复巢穴记录不写入摘要", () => {
    const good = summary(exit(setup(1))).state.dungeon!.questSummary!;
    for (const invalid of [
      { ...good, name: "Scout Ahead I" },
      { ...good, questId: "quest:p003" },
      { ...good, xpPerHero: 1.5 },
      { ...good, clearedRoomIds: ["A", "A"] },
    ])
      expect(dungeonQuestSummarySchema.safeParse(invalid).success).toBe(false);
  });
});
