import { shriekerMechanismFixture } from "../../../test-helpers/shrieker-i";
import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { beginShriekerDungeonTheft, beginShriekerReserveTheft } from "./shrieker-i-provisions";

function fixture(): GameState {
  const state = createCoreDungeonQuest(
    0,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core", "weald"],
  );
  return {
    ...state,
    dungeon: {
      ...state.dungeon!,
      phase: "ready",
      shriekerBossBattles: true,
      activeBossThreatScriptId: "boss:weald:shrieker:1",
      imminentThreatDescriptionCardId: "boss_ability:weald:p001",
    },
  };
}

it("R-262 多枚取得逐枚加入／弃置，不能预先丢弃队列后项；原待选在最后恢复", () => {
  const state = fixture();
  const d = state.dungeon!;
  const a = { id: "a", face: "food" as const },
    b = { id: "b", face: "torch" as const };
  const original = { id: "original", prompt: "原流程", options: [{ id: "x", label: "x" }] };
  const gained = {
    ...state,
    dungeon: {
      ...d,
      pending: original,
      explorationSetup: { ...d.explorationSetup!, provisions: [a, b] },
    },
  };
  const pending = beginShriekerDungeonTheft(state, { state: gained, events: [] });
  expect(pending.pendingChoice!.options.map((o) => o.id)).toEqual(["a"]);
  const wrong = applyCommand(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "b",
  });
  expect(wrong.state).toBe(pending.state);
  const second = applyCommand(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "a",
  });
  expect(second.pendingChoice!.options.map((o) => o.id)).toEqual(["b"]);
  const restored = JSON.parse(JSON.stringify(second.state)) as GameState;
  const finish = applyCommand(restored, {
    type: "resolveChoice",
    choiceId: second.pendingChoice!.id,
    optionId: "b",
  });
  expect(finish.state.dungeon!.explorationSetup!.provisions).toEqual([]);
  expect(finish.pendingChoice).toEqual(original);
  expect(finish.state.dungeon!.cursor).toBe(state.dungeon!.cursor);
});

it("R-261 reserve 只弃一枚，任意类型由玩家选，不能丢任务强制道具", () => {
  const state = fixture();
  const pool = [
    { id: "food", face: "food" as const },
    { id: "torch", face: "torch" as const },
    { id: "dungeon-quest-provision:potion", face: "potion" as const },
  ];
  const source = {
    ...state,
    dungeon: {
      ...state.dungeon!,
      explorationSetup: { ...state.dungeon!.explorationSetup!, provisions: pool },
    },
  };
  const result = beginShriekerReserveTheft({ state: source, events: [] });
  expect(result.pendingChoice!.options.map((o) => o.id)).toEqual(["food", "torch"]);
  expect(applyCommand(result.state, { type: "scoutDungeon" }).state).toBe(result.state);
  const chosen = applyCommand(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "torch",
  });
  expect(chosen.state.dungeon!.explorationSetup!.provisions).toEqual([pool[0], pool[2]]);
  expect(chosen.state.dungeon!.shriekerTheft).toBeUndefined();
});

it("R30 无版本、非当前威胁或已经翻战斗面不触发补给盗取", () => {
  const source = fixture();
  for (const changes of [
    { shriekerBossBattles: undefined },
    { activeBossThreatScriptId: "boss:weald:hag:1" as const },
    { bossCombatThreatCeased: "boss:weald:shrieker:1" as const },
  ]) {
    const state = { ...source, dungeon: { ...source.dungeon!, ...changes } } as GameState;
    const result = { state, events: [] };
    expect(beginShriekerReserveTheft(result)).toBe(result);
  }
});

it("R-262 战斗盗取推进战斗选择游标，地牢游标留待既有战后交接，不重复 choice id", () => {
  const source = fixture();
  const battle = shriekerMechanismFixture().deployed.battle!;
  const before: GameState = {
    ...source,
    dungeon: { ...source.dungeon!, phase: "inBattle" },
    battle: { ...battle, choiceCursor: 7 },
  };
  const gained: GameState = {
    ...before,
    battle: {
      ...before.battle!,
      provisions: [...before.battle!.provisions!, { id: "new-provision", face: "food" }],
    },
  };
  const pending = beginShriekerDungeonTheft(before, { state: gained, events: [] });
  expect(pending.pendingChoice!.id).toBe("shrieker-theft:7");
  expect(pending.state.battle!.choiceCursor).toBe(8);
  expect(pending.state.dungeon!.decision).toBe(before.dungeon!.decision);
  const next = applyCommand(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "new-provision",
  });
  expect(next.state.battle!.choiceCursor).toBe(8);
  expect(next.state.battle!.rngCursor).toBe(before.battle!.rngCursor);
  expect(next.state.battle!.pending).toBeNull();
});
