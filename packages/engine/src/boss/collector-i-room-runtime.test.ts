import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleState } from "../battle";
import type { BattleEntity } from "../battle";
import { applyCommand } from "../command";
import type { ApplyResult, Command, GameState } from "../command";
import { closeBattleLoot, createLootState } from "../loot";
import type { MonsterCardView } from "../monster-skill";
import { COLLECTOR_I_COMBAT_MONSTER_CARD_ID, COLLECTOR_I_SCRIPT_ID } from "./collector-i";

const card = (
  JSON.parse(
    readFileSync(
      new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url),
      "utf8",
    ),
  ).cards as MonsterCardView[]
).find((c) => c.id === COLLECTOR_I_COMBAT_MONSTER_CARD_ID)!;
function setup(binding: string | null = "b"): GameState {
  // a/b 是机制夹具逻辑区；不提供 Collector Room 的生产坐标或审批标记。
  const entities: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: "CRUSADER",
      stance,
      areaId: "a",
      skillIds: [],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  const state = createBattleState(7, {
    entities: [
      ...entities,
      {
        id: "collector",
        side: "monster",
        hero: null,
        monsterCardId: card.id,
        life: card.life,
        stance: "aggressive",
        stanceSlots: 1,
        areaId: "a",
        skillIds: [],
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    monsters: [card],
    skills: [],
    light: 5,
    provisions: [],
    lootPool: createLootState(),
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 10 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 4 },
    ],
    ...(binding === null ? {} : { collectorRoomLootAreaId: binding }),
  });
  return {
    ...state,
    dungeon: {
      phase: "inBattle",
      heroes: [],
      cursor: 0,
      questDistribution: { questId: "quest:p019", campaignLevel: 1 },
      activeBossThreatScriptId: COLLECTOR_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
}
function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
function heroTurn(state: GameState): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) => (e.id === "h0" ? { ...e, areaId: "b" } : e)),
      encounter: {
        ...state.battle!.encounter!,
        deck: ["hero", "monster"],
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
function pick(state: GameState): ApplyResult {
  let result = ok(state, { type: "interactLoot", actorId: "h0" });
  while (result.pendingChoice) {
    const choice = result.pendingChoice;
    result = ok(result.state, {
      type: "resolveChoice",
      choiceId: choice.id,
      optionId: choice.options.find((o) => o.id === "gold" || o.id === "food")!.id,
    });
  }
  return result;
}

describe("C-015 · Collector Room 三宝箱布置（R39、R-047/048/059）", () => {
  it("startBattle 从有限堆在同一区域放三枚不同代币，确定性回放且不修改输入", () => {
    const initial = setup();
    const before = structuredClone(initial);
    const started = ok(initial, { type: "startBattle" });
    expect(started).toEqual(ok(initial, { type: "startBattle" }));
    expect(initial).toEqual(before);
    const loot = started.state.battle!.loot!;
    expect(loot.placed).toHaveLength(3);
    expect(loot.placed.every((t) => t.areaId === "b" && !t.revealed)).toBe(true);
    expect(new Set(loot.placed.map((t) => t.id)).size).toBe(3);
    expect(loot.available).toHaveLength(7);
    expect(loot.claimedIds).toEqual([]);
    expect(new Set([...loot.available, ...loot.placed].map((t) => t.id)).size).toBe(10);
    expect(started.state.battle!.rngCursor).toBe(13); // 十枚宝箱洗牌9步 + 四英雄与本体共五张先攻4步。
    expect(started.state.battle!.entities).toEqual(initial.battle!.entities);
    const again = applyCommand(started.state, { type: "startBattle" });
    expect(again.events[0]!.type).toBe("commandRefused");
    expect(again.state).toBe(started.state);
  });

  it.each([null, "unmapped"])("缺失 / 未知区域 %s 时开战原子拒绝，不放箱或推进 RNG", (binding) => {
    const initial = setup(binding);
    const result = applyCommand(initial, { type: "startBattle" });
    expect(result.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("R-048"),
    });
    expect(result.state).toBe(initial);
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(result.state.battle!.loot).toBeUndefined();
    expect(result.state.battle!.encounter).toBeUndefined();
  });

  it("房间身份、已有标记或已布置宝箱冲突时拒绝，不覆盖已有状态", () => {
    const initial = setup();
    const wrongRoom = {
      ...initial,
      dungeon: {
        ...initial.dungeon!,
        roomCards: {
          active: { cardId: "room:p001" },
        } as unknown as NonNullable<NonNullable<GameState["dungeon"]>["roomCards"]>,
      },
    };
    for (const state of [
      wrongRoom,
      { ...initial, battle: { ...initial.battle!, lootAreas: ["a"] } },
      { ...initial, battle: { ...initial.battle!, loot: createLootState() } },
    ]) {
      const result = applyCommand(state, { type: "startBattle" });
      expect(result.events[0]!.type).toBe("commandRefused");
      expect(result.state).toBe(state);
    }
  });

  it.each([0, 1, 2])("可用堆仅剩 %i 枚时抽空即止，不重用已拾取代币", (remaining) => {
    const initial = setup();
    const canonical = createLootState().available;
    const claimedIds = canonical.slice(remaining).map((t) => t.id);
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        lootPool: {
          ...createLootState(),
          available: canonical.slice(0, remaining),
          claimedIds,
        },
      },
    };
    const started = ok(state, { type: "startBattle" }).state;
    expect(started.battle!.loot!.placed).toHaveLength(remaining);
    expect(started.battle!.loot!.available).toEqual([]);
    expect(started.battle!.loot!.claimedIds).toEqual(claimedIds);
    expect(started.battle!.loot!.placed.every((t) => !claimedIds.includes(t.id))).toBe(true);
    expect(started.battle!.rngCursor).toBe(Math.max(remaining - 1, 0) + 4);
  });

  it("同区三个宝箱逐枚拾取，每次只扣一行动；未拾取回池、已拾取不再出现", () => {
    let state = heroTurn(ok(setup(), { type: "startBattle" }).state);
    const placedIds = state.battle!.loot!.placed.map((t) => t.id);
    for (let index = 0; index < 3; index++) {
      state = pick(heroTurn(state)).state;
      expect(state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
      expect(state.battle!.loot!.placed).toHaveLength(2 - index);
      expect(state.battle!.loot!.claimedIds).toHaveLength(index + 1);
      expect(state.battle!.loot!.claimedIds.every((id) => placedIds.includes(id))).toBe(true);
      const closed = closeBattleLoot(state.battle!.loot)!;
      expect(closed.placed).toEqual([]);
      expect(closed.available).toHaveLength(9 - index);
      expect(new Set([...closed.available.map((t) => t.id), ...closed.claimedIds]).size).toBe(10);
    }
    const exhausted = applyCommand(state, { type: "interactLoot", actorId: "h0" });
    expect(exhausted.events[0]!.type).toBe("commandRefused");
    expect(exhausted.state).toBe(state);
  });

  it("损坏有限堆分区原子拒绝，不把缺少实例补成新宝箱", () => {
    const initial = setup();
    const canonical = createLootState();
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        lootPool: {
          ...canonical,
          available: [...canonical.available.slice(1), canonical.available[1]!],
        },
      },
    };
    const result = applyCommand(state, { type: "startBattle" });
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(state);
  });

  it("普通遭遇仍按每个已核实标记放一箱，不套用 Collector 的三箱规则", () => {
    const initial = setup(null);
    const state = {
      ...initial,
      dungeon: {
        ...initial.dungeon!,
        questDistribution: { questId: "quest:p001", source: "test-fixture", counts: [] },
      },
      battle: { ...initial.battle!, lootAreas: ["a", "b"] },
    };
    const started = ok(state, { type: "startBattle" }).state;
    expect(started.battle!.loot!.placed.map((t) => t.areaId)).toEqual(["a", "b"]);
    expect(started.battle!.loot!.available).toHaveLength(8);
  });
});
