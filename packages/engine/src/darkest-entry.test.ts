import { describe, expect, it } from "vitest";
import { savedCommandSchema } from "../../data/src/quest-save";
import { applyCommand, type Command, type GameState } from "./command";
import {
  DARKEST_ENTRY_FIXED_QUEST_ID,
  darkestActEntryPending,
  readDarkestDungeonEntryReadiness,
} from "./darkest-entry";
import { actThreeCompleteFixture } from "./test-helpers/act-three-complete";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

function refused(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  const event = result.events.find((e) => e.type === "commandRefused");
  expect(event, JSON.stringify(result.events)).toBeTruthy();
  expect(result.state).toBe(game);
  return (event as { message: string }).message;
}

function enteredFixture() {
  const base = actThreeCompleteFixture();
  const entered = ok(base, { type: "enterDarkestDungeon" });
  return { base, entered };
}

describe("第 4 幕最暗入口（§14.7.1 / §14.7.3 / R-191）", () => {
  it("机制夹具：Act III Boss 胜利+回村+村庄阶段结束后固定提供 p016，且不抽普通任务", () => {
    const base = actThreeCompleteFixture();
    expect(darkestActEntryPending(base.dungeon!)).toBe(true);
    expect(readDarkestDungeonEntryReadiness(base)).toEqual({
      kind: "ok",
      questId: DARKEST_ENTRY_FIXED_QUEST_ID,
    });
    const { entered } = enteredFixture();
    const d = entered.state.dungeon!;
    expect(entered.pendingChoice).toEqual(d.pending);
    expect(d.pending!.id).toBe(`hamlet-next-quest:${base.dungeon!.decision}`);
    expect(d.pending!.options).toEqual([{ id: "quest:p016", label: "We Are The Flame" }]);
    expect(d.nextQuestOffers).toEqual(["quest:p016"]);
    // 固定提供不抽卡：不消耗 RNG。
    expect(d.cursor).toBe(base.dungeon!.cursor);
    expect(base.dungeon!.pending).toBeNull();
  });

  it("确认后走 chooseNextQuest：16 房、唯一目标在三 Boss 位、最暗怪物池与 III 级房间/饰品", () => {
    const { base, entered } = enteredFixture();
    const pending = entered.pendingChoice!;
    const result = ok(entered.state, {
      type: "resolveChoice",
      choiceId: pending.id,
      optionId: "quest:p016",
    });
    const d = result.state.dungeon!;
    expect(d.phase).toBe("awaitingProvisions");
    expect(d.questDistribution!.questId).toBe("quest:p016");
    expect(d.campaignLevel).toBe(3);
    expect(d.explorationSetup!.dungeonLevel).toBe(3);
    expect(d.rooms).toHaveLength(16);
    expect(d.rooms.filter((r) => r.kind === "objective")).toHaveLength(1);
    const objective = d.rooms.find((r) => r.kind === "objective")!;
    expect(d.layout.nodes.find((n) => n.id === objective.id)!.slotKind).toBe("boss");
    expect(d.layout.nodes.filter((n) => n.slotKind === "boss")).toHaveLength(3);
    expect(d.darkest?.monsterDeck).toHaveLength(26);
    expect(d.darkest?.monsterPool).toBeDefined();
    expect(d.monsterPool).toBeUndefined();
    expect(d.roomCards!.deck).toHaveLength(8);
    expect(
      d.roomCards!.deck!.every(
        (id) => d.roomCards!.cards.find((c) => c.id === id)?.location === "darkestDungeon",
      ),
    ).toBe(true);
    expect(d.trinkets!.level).toBe(3);
    // 自然战役续接既有游标，不回到 0 重放 RNG。
    expect(d.cursor).toBeGreaterThan(base.dungeon!.cursor);
    expect(d.nextQuestOffers).toBeUndefined();
    expect(d.discardedQuests).toContain("quest:p019");
    // 开局补给仍可掷，形成可玩停点。
    const rolled = ok(result.state, { type: "rollDungeonProvisions" });
    expect(rolled.state.dungeon!.phase).toBe("awaitingProvisions");
  });

  it("同一状态与命令序列结果一致（不因入口重放 RNG）", () => {
    const left = enteredFixture();
    const right = enteredFixture();
    const command = {
      type: "resolveChoice" as const,
      choiceId: left.entered.pendingChoice!.id,
      optionId: "quest:p016",
    };
    expect(ok(left.entered.state, command)).toEqual(ok(right.entered.state, command));
  });

  it("第 4 幕不再回落到普通 2 选 1：offerNextQuest 拒绝且不消耗 RNG", () => {
    const base = actThreeCompleteFixture();
    const message = refused(base, { type: "offerNextQuest" });
    expect(message).toContain("进入最暗地牢");
    expect(darkestActEntryPending(base.dungeon!)).toBe(true);
  });

  it("已进入最暗任务后再次调用入口被拒绝", () => {
    const { entered } = enteredFixture();
    // 待选期间先被选任务窗口拦截，不允许重复开新候选。
    refused(entered.state, { type: "enterDarkestDungeon" });
    const pending = entered.pendingChoice!;
    const embarked = ok(entered.state, {
      type: "resolveChoice",
      choiceId: pending.id,
      optionId: "quest:p016",
    });
    expect(refused(embarked.state, { type: "enterDarkestDungeon" })).toContain(
      "已在最暗地牢任务中",
    );
  });

  it("未到 Act III Boss 胜利、村庄阶段未结束或非 III 级都拒绝", () => {
    const base = actThreeCompleteFixture();
    const { bossQuestVictory: _victory, ...d } = base.dungeon!;
    void _victory;
    expect(
      readDarkestDungeonEntryReadiness({
        ...base,
        dungeon: {
          ...d,
          campaignLevel: 2,
          questSummary: { ...d.questSummary!, questId: "quest:p019" },
        },
      }).kind,
    ).toBe("blocked");
    expect(readDarkestDungeonEntryReadiness({ ...base, dungeon: d }).kind).toBe("blocked");
    expect(
      readDarkestDungeonEntryReadiness({
        ...base,
        dungeon: { ...d, hamlet: { ...d.hamlet!, phase: "heroActions" } },
      }).kind,
    ).toBe("blocked");
    expect(
      readDarkestDungeonEntryReadiness({
        ...base,
        dungeon: { ...d, defeatedRuinsBossIdentities: [d.defeatedRuinsBossIdentities![0]!] },
      }).kind,
    ).toBe("blocked");
    expect(
      readDarkestDungeonEntryReadiness({
        ...base,
        battle: {} as NonNullable<GameState["battle"]>,
      }).kind,
    ).toBe("blocked");
  });

  it("II→III 升幕后残留的 II 幕 p019 胜利摘要不触发第 4 幕入口", () => {
    const base = actThreeCompleteFixture();
    const { hamlet: _hamlet, ...afterAdvance } = base.dungeon!;
    void _hamlet;
    // 升幕发生在抽村庄事件之前：仍是 II 幕 Boss 的摘要与两次击败记录。
    const advanced = {
      ...afterAdvance,
      campaignLevel: 3 as const,
      defeatedRuinsBossIdentities: (base.dungeon!.defeatedRuinsBossIdentities ?? []).slice(0, 2),
    };
    expect(darkestActEntryPending(advanced)).toBe(false);
    expect(readDarkestDungeonEntryReadiness({ ...base, dungeon: advanced }).kind).toBe("blocked");
    const message = refused({ ...base, dungeon: advanced }, { type: "offerNextQuest" });
    expect(message).not.toContain("最暗");
  });

  it("入口命令可写入严格存档命令日志", () => {
    expect(savedCommandSchema.safeParse({ type: "enterDarkestDungeon" }).success).toBe(true);
    expect(
      savedCommandSchema.safeParse({ type: "enterDarkestDungeon", questId: "quest:p016" }).success,
    ).toBe(false);
  });
});
