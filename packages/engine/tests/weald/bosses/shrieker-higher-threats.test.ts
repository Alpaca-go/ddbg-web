import trinketData from "../../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../../data/src/normalize/schema";
import { createTrinketPool } from "../../../src/shared/trinkets/trinket-acquisition";
import { wealdSuppliesLootFixture, wealdTaskSources } from "../../helpers/weald-task-battle";
import { describe, expect, it } from "vitest";
import { applyCommand, type ApplyResult, type GameState } from "../../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty } from "../../helpers/core-quest";
import { beginHigherShriekerGain } from "../../../src/weald/bosses/shrieker-i-provisions";
const item = (id: string) => ({ id, face: "food" as const });
function fixture(level: 2 | 3): GameState {
  const state = createCoreDungeonQuest(
    0,
    "quest:weald:p001",
    "standard",
    coreParty,
    wealdTaskSources,
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

it("显式高等级版本自身携带R-266容量口径，缺旧独立标记仍先容量后威胁", () => {
  const source = fixture(3),
    { inventoryOverflow: _flag, ...state } = source;
  void _flag;
  const before = {
    ...state,
    dungeon: {
      ...state.dungeon!,
      explorationSetup: {
        ...state.dungeon!.explorationSetup!,
        provisions: Array.from({ length: 16 }, (_, i) => item(`p${i}`)),
      },
    },
  };
  // 公开命令入口先激活该高等级版本的容量行为，随后取得走同一规则。
  const marked = applyCommand(before, { type: "ping", message: "checkpoint" }).state;
  expect(marked.inventoryOverflow).toBe(true);
  const result = beginHigherShriekerGain(marked, {
    state: {
      ...marked,
      dungeon: {
        ...marked.dungeon!,
        explorationSetup: {
          ...marked.dungeon!.explorationSetup!,
          provisions: [...marked.dungeon!.explorationSetup!.provisions, item("new")],
        },
      },
    },
    events: [],
  });
  expect(result.pendingChoice!.id).toMatch(/^inventory-overflow:/);
});

it("III最后弃置后回合结束治疗保留饰品待选；JSON恢复不重复弃置或治疗", () => {
  const source = wealdSuppliesLootFixture(),
    d = fixture(3).dungeon!,
    b = source.battle!,
    actor = b.entities[0]!,
    turn = b.encounter!.turn;
  if (turn.type !== "hero") throw new Error("hero fixture");
  const pool = createTrinketPool(normalizedTrinketFileSchema.parse(trinketData).cards, 2);
  const before: GameState = {
    ...source,
    inventoryOverflow: true,
    dungeon: {
      ...source.dungeon!,
      campaignLevel: 3,
      wealdHigherBosses: true,
      shriekerBossBattles: true,
      activeBossThreatScriptId: d.activeBossThreatScriptId!,
      imminentThreatDescriptionCardId: d.imminentThreatDescriptionCardId!,
    },
    battle: {
      ...b,
      provisions: [],
      areas: b.areas.map((a) => (a.id === actor.areaId ? { ...a, endTurnHeal: 3 as const } : a)),
      entities: b.entities.map((e) =>
        e.side === "hero"
          ? { ...e, heroLevel: 1 as const, ...(e.id === actor.id ? { wounds: 8 } : {}) }
          : e,
      ),
      trinkets: {
        ...pool,
        held: [{ cardId: "trinket:p023", heroId: actor.id, face: "upright" }],
        deck: pool.cards.filter((c) => c.id !== "trinket:p023").map((c) => c.id),
      },
      encounter: { ...b.encounter!, turn: { ...turn, actions: 0 } },
    },
  };
  const acquired = beginHigherShriekerGain(
    before,
    { state: { ...before, battle: { ...before.battle!, provisions: [item("new")] } }, events: [] },
    { type: "finishTurn", actorId: actor.id },
  );
  const command = {
    type: "resolveChoice",
    choiceId: acquired.pendingChoice!.id,
    optionId: "new",
    allTrinkets: true,
  } as const;
  const open = applyCommand(acquired.state, command);
  expect(open.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(open.pendingChoice!.options.map((o) => o.id)).toContain("trinket:p023");
  const chooseTrinket = {
    type: "resolveChoice",
    choiceId: open.pendingChoice!.id,
    optionId: "trinket:p023",
    allTrinkets: true,
  } as const;
  const done = applyCommand(open.state, chooseTrinket);
  expect(done.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(done.state.battle!.entities.find((e) => e.id === actor.id)!.wounds).toBe(1);
  expect(done.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  expect(done.state.battle!.provisions).toEqual([]);
  expect(done.state.dungeon!.shriekerTheft).toBeUndefined();
  expect(applyCommand(JSON.parse(JSON.stringify(open.state)) as GameState, chooseTrinket)).toEqual(
    done,
  );
});

it("III与Lost Shipment组合只能取消仍存在的常规骰，奖励骰不受影响", () => {
  const source = fixture(3);
  const ready: GameState = {
    ...source,
    dungeon: {
      ...source.dungeon!,
      phase: "awaitingProvisions",
      nextQuestLostShipment: true,
      nextQuestPartyProvisionDice: 2,
      heroes: source.dungeon!.heroes.map((h, i) =>
        i === 0 ? { ...h, nextQuestProvisionDice: 2 } : h,
      ),
    },
  };
  let result = applyCommand(ready, { type: "rollDungeonProvisions" });
  expect(result.pendingChoice!.options).toHaveLength(4);
  expect(result.pendingChoice!.options.every((o) => o.id.endsWith(":0"))).toBe(true);
  result = choose(result);
  expect(result.pendingChoice!.options).toHaveLength(3);
  result = choose(result);
  for (let i = 0; result.pendingChoice && i < 20; i++)
    result = choose(
      result,
      result.pendingChoice.options.some((o) => o.id === "food") ? "food" : undefined,
    );
  expect(result.state.dungeon!.phase).toBe("ready");
  expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(6);
});
