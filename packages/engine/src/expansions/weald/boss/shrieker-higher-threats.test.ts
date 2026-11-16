import { wealdSuppliesLootFixture } from "../../../test-helpers/weald-task-battle";
import { describe, expect, it } from "vitest";
import { applyCommand, type ApplyResult, type GameState } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { beginHigherShriekerGain } from "./shrieker-i-provisions";
const item = (id: string) => ({ id, face: "food" as const });
function fixture(level: 2 | 3): GameState {
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
    inventoryOverflow: true,
    dungeon: {
      ...state.dungeon!,
      campaignLevel: level,
      wealdHigherBosses: true,
      shriekerBossBattles: true,
      activeBossThreatScriptId: `boss:weald:shrieker:${level}`,
      imminentThreatDescriptionCardId: `boss_ability:weald:p00${level}`,
      phase: "ready",
    },
  };
}
function choose(result: ApplyResult, id?: string) {
  const command = {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: id ?? result.pendingChoice!.options[0]!.id,
  } as const;
  const next = applyCommand(result.state, command);
  expect(next.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(applyCommand(JSON.parse(JSON.stringify(result.state)) as GameState, command)).toEqual(
    next,
  );
  return next;
}
it("III逐枚获得先容量后弃两枚，第二枚尚未入池；每个检查点JSON续接", () => {
  const state = fixture(3),
    old = Array.from({ length: 16 }, (_, i) => item(`old${i}`));
  const before = {
    ...state,
    dungeon: {
      ...state.dungeon!,
      explorationSetup: { ...state.dungeon!.explorationSetup!, provisions: old },
    },
  };
  const pending = { id: "original", prompt: "原流程", options: [{ id: "x", label: "x" }] };
  const gained = {
    ...before,
    dungeon: {
      ...before.dungeon,
      pending,
      explorationSetup: {
        ...before.dungeon.explorationSetup,
        provisions: [...old, item("new1"), item("new2")],
      },
    },
  };
  let result = beginHigherShriekerGain(before, { state: gained, events: [] });
  expect(result.pendingChoice!.id).toMatch(/^inventory-overflow:/);
  expect(result.pendingChoice!.options.map((o) => o.id)).not.toContain("new2");
  result = choose(result, "new1");
  expect(result.pendingChoice!.id).toMatch(/^shrieker-theft:/);
  result = choose(result, "old0");
  result = choose(result, "old1");
  expect(result.pendingChoice!.options.map((o) => o.id)).toContain("new2");
  result = choose(result, "new2");
  result = choose(result, "old2");
  expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(13);
  expect(result.pendingChoice).toEqual(pending);
  expect(result.state.dungeon!.shriekerTheft).toBeUndefined();
});
it("III不足两枚全弃仍继续后续获得，最后恢复原待选", () => {
  const before = fixture(3),
    pending = { id: "original", prompt: "原流程", options: [{ id: "x", label: "x" }] };
  let result = beginHigherShriekerGain(before, {
    state: {
      ...before,
      dungeon: {
        ...before.dungeon!,
        pending,
        explorationSetup: {
          ...before.dungeon!.explorationSetup!,
          provisions: [item("a"), item("b")],
        },
      },
    },
    events: [],
  });
  result = choose(result, "a");
  expect(result.pendingChoice!.options.map((o) => o.id)).toEqual(["b"]);
  result = choose(result, "b");
  expect(result.state.dungeon!.explorationSetup!.provisions).toEqual([]);
  expect(result.pendingChoice).toEqual(pending);
});
it("II忽略已完整生成的普通补给，保留骰游标、事件和原待选", () => {
  const before = fixture(2),
    pending = { id: "wild", prompt: "Wild", options: [{ id: "food", label: "食物" }] };
  const gained = {
    ...before,
    dungeon: {
      ...before.dungeon!,
      cursor: 9,
      pending,
      explorationSetup: { ...before.dungeon!.explorationSetup!, provisions: [item("new")] },
    },
  };
  const result = beginHigherShriekerGain(before, {
    state: gained,
    events: [],
    pendingChoice: pending,
  });
  expect(result.state.dungeon!.cursor).toBe(9);
  expect(result.pendingChoice).toEqual(pending);
  expect(result.state.dungeon!.explorationSetup!.provisions).toEqual([]);
});
describe.each([2, 3] as const)("Shrieker %i 开局补给", (level) => {
  it("II骰后弃三枚；III只减四枚常规骰，英雄及队伍奖励保留", () => {
    const state = fixture(level);
    const ready: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        phase: "awaitingProvisions",
        heroes: state.dungeon!.heroes.map((h, i) =>
          i === 0 ? { ...h, nextQuestProvisionDice: 2 } : h,
        ),
        nextQuestPartyProvisionDice: 2,
      },
    };
    let result = applyCommand(ready, { type: "rollDungeonProvisions" });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    let discards = 0;
    for (let i = 0; result.pendingChoice && i < 30; i++) {
      if (result.state.dungeon!.shriekerTheft) discards++;
      result = choose(
        result,
        result.pendingChoice.options.some((o) => o.id === "food") ? "food" : undefined,
      );
    }
    expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(level === 2 ? 9 : 8);
    expect(discards).toBe(level === 2 ? 3 : 0);
    expect(result.state.dungeon!.phase).toBe("ready");
  });
});

it.each([2, 3] as const)(
  "等级%i真实Lost Supplies箱：Wild选面、两骰及最后行动只支付一次",
  (level) => {
    const source = wealdSuppliesLootFixture(),
      b = source.battle!,
      threat = fixture(level).dungeon!,
      turn = b.encounter!.turn;
    if (turn.type !== "hero") throw new Error("hero fixture");
    const initial: GameState = {
      ...source,
      inventoryOverflow: true,
      dungeon: {
        ...source.dungeon!,
        wealdHigherBosses: true,
        shriekerBossBattles: true,
        campaignLevel: level,
        activeBossThreatScriptId: threat.activeBossThreatScriptId!,
        imminentThreatDescriptionCardId: threat.imminentThreatDescriptionCardId!,
      },
      battle: {
        ...b,
        provisions: Array.from({ length: 16 }, (_, i) => item(`old${i}`)),
        encounter: { ...b.encounter!, turn: { ...turn, actions: 1 } },
      },
    };
    let result = applyCommand(initial, { type: "interactLoot", actorId: b.entities[0]!.id }),
      rolls = result.events.filter((e) => e.type === "provisionRolled").length,
      thefts = 0,
      overflows = 0;
    for (let i = 0; result.pendingChoice && i < 20; i++) {
      if (result.state.dungeon!.shriekerTheft && !result.state.inventoryOverflowHold) thefts++;
      if (result.state.inventoryOverflowHold) overflows++;
      result = choose(
        result,
        result.pendingChoice.options.some((o) => o.id === "food") ? "food" : undefined,
      );
      rolls += result.events.filter((e) => e.type === "provisionRolled").length;
    }
    expect(rolls).toBe(2);
    expect(thefts).toBe(level === 2 ? 0 : 4);
    expect(overflows).toBe(level === 2 ? 0 : 1);
    expect(result.state.battle!.provisions).toHaveLength(level === 2 ? 16 : 13);
    expect(result.state.battle!.loot!.placed).toEqual([]);
    expect(result.state.battle!.loot!.claimedIds).toHaveLength(1);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
  },
);
