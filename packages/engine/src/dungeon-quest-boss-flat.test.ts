import { describe, expect, it } from "vitest";
import { bossFlatQuestSummarySchema } from "../../data/src/quest-summary";
import { applyCommand, type GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";

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
