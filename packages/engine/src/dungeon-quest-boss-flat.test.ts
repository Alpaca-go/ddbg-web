import { describe, expect, it } from "vitest";
import { bossFlatQuestSummarySchema } from "../../data/src/quest-summary";
import { applyCommand, type GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { readDungeonQuestProgress } from "./dungeon-quest";
import { createTrinketPool } from "./trinket-acquisition";
import trinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";

function exitedFaceTheThreat(seed = 71, extra: Partial<GameState["dungeon"]> = {}): GameState {
  const base = createCoreDungeonQuest(seed, "quest:p019", "radiant", coreParty, coreQuestSources);
  const d = base.dungeon!;
  return {
    ...base,
    dungeon: {
      ...d,
      phase: "exited",
      pending: null,
      ...(d.roomCards ? { roomCards: { ...d.roomCards, active: null } } : {}),
      ...(d.monsterPool ? { monsterPool: { ...d.monsterPool, active: null } } : {}),
      ...(d.curio ? { curio: { ...d.curio, active: null } } : {}),
      ...extra,
    },
  };
}

describe("Boss 定额任务摘要（R-122）", () => {
  /** 显式胜利后机制夹具；不是自然 Boss 入场或完整战役验收。 */
  function campaignVictory(level: 1 | 2 | 3): GameState {
    const base = exitedFaceTheThreat(71, { bossQuestVictory: true, campaignLevel: level });
    const d = base.dungeon!;
    return {
      ...base,
      dungeon: {
        ...d,
        trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, level),
        explorationSetup: { ...d.explorationSetup!, dungeonLevel: level, provisions: [] },
      },
    };
  }

  it.each([1, 2, 3] as const)("实际 %i 级 p019 胜利后摘要→回村→发 3 XP；不重复支付", (level) => {
    const state = campaignVictory(level);
    const before = JSON.stringify(state);
    let game = state;
    for (const type of [
      "summarizeDungeonQuest",
      "beginReturnToHamlet",
      "finishReturnToHamlet",
    ] as const) {
      const result = applyCommand(game, { type });
      expect(
        result.events.some((e) => e.type === "commandRefused"),
        JSON.stringify(result.events),
      ).toBe(false);
      expect(result.pendingChoice).toBeUndefined();
      expect(result).toEqual(applyCommand(JSON.parse(JSON.stringify(game)), { type }));
      game = result.state;
    }
    expect(JSON.stringify(state)).toBe(before);
    expect(game.dungeon!.questSummary).toMatchObject({
      xpPerHero: 3,
      stagecoachXp: 3,
      awarded: true,
    });
    expect(game.dungeon!.stagecoachXp).toBe((state.dungeon!.stagecoachXp ?? 0) + 3);
    expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual(
      state.dungeon!.heroes.map((h) => (h.xp ?? 0) + 3),
    );
    expect(game.dungeon!.phase).toBe("inHamlet");
    const duplicate = applyCommand(game, { type: "finishReturnToHamlet" });
    expect(duplicate.state).toBe(game);
    expect(duplicate.events[0]?.type).toBe("commandRefused");
  });

  it("正式 I/II 任务不能借 p019 的 III 级占位放过错级；未胜利仍拒绝", () => {
    for (const level of [1, 2] as const) {
      const state = campaignVictory(level);
      const wrong = {
        ...state,
        dungeon: {
          ...state.dungeon!,
          explorationSetup: { ...state.dungeon!.explorationSetup!, dungeonLevel: 3 as const },
        },
      };
      expect(readDungeonQuestProgress(wrong.dungeon).status).toBe("refused");
      const rejected = applyCommand(wrong, { type: "summarizeDungeonQuest" });
      expect(rejected.state).toBe(wrong);
      const { bossQuestVictory: _victory, ...withoutVictory } = state.dungeon!;
      void _victory;
      const noVictory = { ...state, dungeon: withoutVictory };
      expect(applyCommand(noVictory, { type: "summarizeDungeonQuest" }).state).toBe(noVictory);
    }
  });
  it("quest:p019 + bossQuestVictory：固定 3 XP 摘要", () => {
    const state = exitedFaceTheThreat(71, { bossQuestVictory: true });
    const result = applyCommand(state, { type: "summarizeDungeonQuest" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const summary = result.state.dungeon!.questSummary!;
    expect(summary).toMatchObject({
      questId: "quest:p019",
      name: "Face the Threat!",
      xpPerHero: 3,
      stagecoachXp: 3,
      awarded: false,
    });
    expect(bossFlatQuestSummarySchema.safeParse(summary).success).toBe(true);
  });

  it("未击败 Boss 时拒绝摘要", () => {
    const state = exitedFaceTheThreat(72);
    const result = applyCommand(state, { type: "summarizeDungeonQuest" });
    expect(result.state).toBe(state);
    expect(result.events[0]).toMatchObject({ type: "commandRefused" });
  });
});
