import { describe, expect, it, beforeEach } from "vitest";
import { applyCommand } from "../command";
import type { GameState } from "../command";
import {
  COLLECTOR_I_SCRIPT_ID,
  NECROMANCER_I_SCRIPT_ID,
  ensureCoreBossScriptsRegistered,
  setActiveBossThreat,
} from "./index";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";

function hamletAfterCaretaker(seed = 41) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  const step = (command: Parameters<typeof applyCommand>[1]) => {
    const r = applyCommand(game, command);
    expect(
      r.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(r.events),
    ).toBe(false);
    game = r.state;
    return r;
  };
  let r = step({ type: "rollDungeonProvisions" });
  while (r.pendingChoice) {
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  }
  r = step({ type: "leaveDungeon" });
  step({ type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    step({ type });
  return game;
}

describe("setActiveBossThreat 沙盒运行时", () => {
  beforeEach(() => ensureCoreBossScriptsRegistered());

  it("经 applyCommand 挂接与 applyActiveBossThreatToDungeon 相同路径，且不推进 cursor", () => {
    const game = hamletAfterCaretaker();
    const cursor = game.dungeon!.cursor;
    const result = applyCommand(game, {
      type: "setActiveBossThreat",
      scriptId: NECROMANCER_I_SCRIPT_ID,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.dungeon!.activeBossThreatScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(result.state.dungeon!.cursor).toBe(cursor);
    expect(result.events[0]?.message).toMatch(/stub/);
    expect(result.state.dungeon!.hamlet!.blockedBuildings).toContain("graveyard");
  });

  it("换威胁时按 KNOWN 列表 strip 并合并新封锁（Necromancer → Collector）", () => {
    let game = hamletAfterCaretaker();
    game = applyCommand(game, {
      type: "setActiveBossThreat",
      scriptId: NECROMANCER_I_SCRIPT_ID,
    }).state;
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("graveyard");
    game = applyCommand(game, {
      type: "setActiveBossThreat",
      scriptId: COLLECTOR_I_SCRIPT_ID,
    }).state;
    expect(game.dungeon!.activeBossThreatScriptId).toBe(COLLECTOR_I_SCRIPT_ID);
    expect(game.dungeon!.hamlet!.blockedBuildings).not.toContain("graveyard");
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("nomadWagon");
  });

  it("写入已注册脚本时清除 unregisteredImminentThreatHold", () => {
    const base = {
      seed: 1,
      notes: [],
      dungeon: {
        phase: "inHamlet",
        cursor: 0,
        unregisteredImminentThreatHold: "II 级 Necromancer 描述卡 hold",
      },
    } as unknown as GameState;
    const next = setActiveBossThreat(base, {
      type: "setActiveBossThreat",
      scriptId: NECROMANCER_I_SCRIPT_ID,
    });
    expect(next.state.dungeon!.unregisteredImminentThreatHold).toBeUndefined();
    expect(next.state.dungeon!.activeBossThreatScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
  });

  it("战斗进行中拒命令且不改变状态", () => {
    const state = {
      seed: 1,
      notes: [],
      battle: { entities: [] },
      dungeon: { phase: "inBattle", cursor: 3, activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID },
    } as unknown as GameState;
    const result = setActiveBossThreat(state, {
      type: "setActiveBossThreat",
      scriptId: COLLECTOR_I_SCRIPT_ID,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(state);
    expect(result.state.dungeon!.cursor).toBe(3);
  });
});
