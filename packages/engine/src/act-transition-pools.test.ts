import { expect, it } from "vitest";
import { switchRuinsActPools } from "./act-transition-pools";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { trinketPoolProblem, type TrinketPool } from "./trinket-acquisition";

const d = createCoreDungeonQuest(1, "quest:p001", "radiant", coreParty, coreQuestSources).dungeon!;
const base = d.monsterPool!;
const expected = dungeonMonsterPoolThrough(base, 1).map((m) => m.instanceId);
const pool = { ...base, remaining: expected.slice(2), discarded: expected.slice(0, 2) };
const held: TrinketPool = {
  ...d.trinkets!,
  held: [{ cardId: "trinket:p001", heroId: d.heroes[0]!.id, face: "inverted" }],
  deck: d.trinkets!.cards.map((c) => c.id).filter((id) => id !== "trinket:p001"),
};

it("I→II合并旧堆/弃牌后加11张；II→III再加9张，保留倒置持牌与旧饰品分区", () => {
  const before = structuredClone({ pool, held });
  const second = switchRuinsActPools(1, pool, held, d.heroes);
  expect(second.kind).toBe("ready");
  if (second.kind !== "ready") throw new Error(second.reason);
  expect(second.monsterPool.remaining).toHaveLength(53);
  expect(second.monsterPool.remaining!.slice(0, 42)).toEqual([
    ...pool.remaining,
    ...pool.discarded,
  ]);
  expect(second.monsterPool.discarded).toEqual([]);
  expect(second.trinkets.held).toEqual(held.held);
  expect(second.trinkets.inactive?.map((p) => p.level)).toEqual([1]);
  expect(trinketPoolProblem(second.trinkets, d.heroes)).toBeNull();
  const third = switchRuinsActPools(2, second.monsterPool, second.trinkets, d.heroes);
  expect(third.kind).toBe("ready");
  if (third.kind !== "ready") throw new Error(third.reason);
  expect(third.monsterPool.remaining).toHaveLength(62);
  expect(third.trinkets.held).toEqual(held.held);
  expect(third.trinkets.inactive?.map((p) => p.level)).toEqual([1, 2]);
  expect(trinketPoolProblem(third.trinkets, d.heroes)).toBeNull();
  expect({ pool, held }).toEqual(before);
});

it("永久移出的三张普通怪物两次升幕均不复活，目录保留完整24种", () => {
  const removed = { ...base, permanentlyRemovedCombatCardIds: ["monster_medium:p018"] };
  const first = switchRuinsActPools(
    1,
    { ...removed, remaining: null, discarded: [] },
    held,
    d.heroes,
  );
  expect(first.kind).toBe("ready");
  if (first.kind !== "ready") throw new Error(first.reason);
  expect(first.monsterPool.remaining).toHaveLength(50);
  const next = switchRuinsActPools(2, first.monsterPool, first.trinkets, d.heroes);
  if (next.kind !== "ready") throw new Error(next.reason);
  expect(next.monsterPool.remaining).toHaveLength(59);
  expect(next.monsterPool.cards).toHaveLength(24);
  expect(next.monsterPool.permanentlyRemovedCombatCardIds).toEqual(
    removed.permanentlyRemovedCombatCardIds,
  );
  expect(
    next.monsterPool.remaining!.some((id) =>
      [18, 19, 20].some((p) => id === `monster-deck:p0${p}`),
    ),
  ).toBe(false);
});

it("缺失/重复/未来/已移出实例、坏移出记录和饰品错级均拒绝且不改输入", () => {
  const altered = [
    { ...pool, remaining: pool.remaining.slice(1) },
    { ...pool, remaining: [...pool.remaining, pool.remaining[0]!] },
    { ...pool, remaining: [...pool.remaining.slice(1), "monster-deck:p049"] },
    { ...pool, permanentlyRemovedCombatCardIds: ["monster_medium:p018"] },
    { ...pool, permanentlyRemovedCombatCardIds: ["monster_medium:p018", "monster_medium:p018"] },
    { ...pool, permanentlyRemovedCombatCardIds: ["monster_medium:p050"] },
    { ...pool, remaining: null },
  ];
  for (const changed of altered) {
    const before = structuredClone(changed);
    expect(switchRuinsActPools(1, changed, held, d.heroes).kind).toBe("blocked");
    expect(changed).toEqual(before);
  }
  expect(switchRuinsActPools(2, pool, held, d.heroes).kind).toBe("blocked");
  expect(switchRuinsActPools(1, pool, { ...held, level: 2 }, d.heroes).kind).toBe("blocked");
  const display = {
    ...held,
    deck: held.deck!.filter((id) => id !== "trinket:p002"),
    display: ["trinket:p002"],
  };
  expect(trinketPoolProblem(display, d.heroes)).toBeNull();
  expect(switchRuinsActPools(1, pool, display, d.heroes).kind).toBe("blocked");
  expect(switchRuinsActPools(1, { ...pool, cards: pool.cards.slice(1) }, held, d.heroes).kind).toBe(
    "blocked",
  );
});
