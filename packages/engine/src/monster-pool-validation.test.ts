import { expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createWealdLevelOneMonsterPoolState } from "./expansions/weald/monster-pool";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import {
  dungeonMonsterPoolCatalogValid,
  monsterPoolCatalogValidForLocation,
  restingMonsterPoolValid,
} from "./monster-pool-validation";
import { recoverHamletPools } from "./hamlet-return-pools";
import { switchRuinsActPools } from "./act-transition-pools";

const setup = () =>
  createCoreDungeonQuest(1, "quest:p001", "radiant", coreParty, coreQuestSources).dungeon!;
const local = () =>
  createWealdLevelOneMonsterPoolState({
    core: coreQuestSources.monsters,
    medium,
    large,
    contentPacks: ["core", "weald"],
  });

it("核心状态回村保持完整实例；余牌和弃牌可分区，缺卡、重复、活动遭遇拒绝", () => {
  const d = setup();
  const ids = dungeonMonsterPoolThrough(d.monsterPool!, 1).map((entry) => entry.instanceId);
  const valid = {
    ...d,
    monsterPool: { ...d.monsterPool!, remaining: ids.slice(2), discarded: ids.slice(0, 2) },
  };
  expect(restingMonsterPoolValid(d)).toBe(true);
  expect(restingMonsterPoolValid(valid)).toBe(true);
  expect(recoverHamletPools(valid, 1).status).toBe("resolved");
  for (const pool of [
    { ...valid.monsterPool, remaining: ids.slice(3) },
    { ...valid.monsterPool, remaining: ids },
    { ...valid.monsterPool, remaining: null },
    { ...valid.monsterPool, active: { roomId: "D", monsters: [], blockedReason: "pending" } },
  ]) {
    const state = { ...valid, monsterPool: pool };
    const before = structuredClone(state);
    expect(restingMonsterPoolValid(state)).toBe(false);
    expect(recoverHamletPools(state, 1).status).toBe("refused");
    expect(state).toEqual(before);
  }
});

it("遗迹任务即使已选Weald也拒绝当地状态，不能通过核心来源目录绕过", () => {
  const d = { ...setup(), contentPacks: ["core", "weald"] as const, monsterPool: local() };
  expect(dungeonMonsterPoolCatalogValid(d)).toBe(false);
  expect(recoverHamletPools(d, 1).status).toBe("refused");
  expect(switchRuinsActPools(1, d.monsterPool, d.trinkets!, d.heroes).kind).toBe("blocked");
  expect(monsterPoolCatalogValidForLocation(local(), "weald", 1)).toBe(true);
  expect(monsterPoolCatalogValidForLocation(local(), "weald", 2)).toBe(false);
  expect(monsterPoolCatalogValidForLocation(setup().monsterPool, "weald", 1)).toBe(false);
});

it("永久移除后按有效实例守恒，不能在回村时补回已移除副本", () => {
  const d = setup();
  const cardId = dungeonMonsterPoolThrough(d.monsterPool!, 1)[0]!.cardId;
  const pool = { ...d.monsterPool!, permanentlyRemovedCombatCardIds: [cardId] };
  expect(restingMonsterPoolValid({ ...d, monsterPool: pool })).toBe(true);
  const remaining = dungeonMonsterPoolThrough(d.monsterPool!, 1).map((entry) => entry.instanceId);
  expect(restingMonsterPoolValid({ ...d, monsterPool: { ...pool, remaining } })).toBe(false);
});

it("非法当地目录转为拒绝，旧无怪物池沙盒仍沿用原行为", () => {
  const pool = local();
  pool.wealdInstances.pop();
  expect(monsterPoolCatalogValidForLocation(pool, "weald", 1)).toBe(false);
  expect(monsterPoolCatalogValidForLocation({ ...local(), location: "ruins" }, "ruins", 1)).toBe(
    false,
  );
  const { monsterPool: _pool, ...legacy } = setup();
  void _pool;
  expect(restingMonsterPoolValid(legacy)).toBe(true);
});
