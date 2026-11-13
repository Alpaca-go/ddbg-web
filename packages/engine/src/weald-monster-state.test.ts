import { describe, expect, it } from "vitest";
import coreRaw from "../../data/normalized/corebox/monster_pool.json";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import { monsterPoolFileSchema, ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import {
  createWealdLevelOneMonsterPoolState,
  buildWealdLevelOneMonsterPool,
} from "./expansions/weald/monster-pool";
import { dungeonMonsterPoolThrough, combatCardIdForPoolInstance } from "./monster-pool-runtime";

const core = monsterPoolFileSchema.parse(coreRaw).cards;
const input = () => ({ core, medium, large, contentPacks: ["core", "weald"] as const });
const setup = () => createWealdLevelOneMonsterPoolState(input());

describe("Weald 怪物状态与实例解析（W3、R-230/R-232）", () => {
  it("R-248 monsterDrawScope 仅返回 14 张当地实例", () => {
    const state = { ...setup(), monsterDrawScope: "wealdLocalOnly" as const };
    const pool = dungeonMonsterPoolThrough(state, 1);
    expect(pool).toHaveLength(14);
    expect(pool.every((c) => c.instanceId.startsWith("monster-deck:weald:"))).toBe(true);
  });

  it("创建保留来源与14当地实例，45张出征目录可由JSON状态重建", () => {
    const state = setup();
    expect(state.cards).toEqual(core);
    expect(state.wealdInstances).toHaveLength(14);
    expect(state.remaining).toBeNull();
    expect(state.discarded).toEqual([]);
    const before = structuredClone(state);
    expect(dungeonMonsterPoolThrough(state, 1)).toEqual(buildWealdLevelOneMonsterPool(input()));
    const restored = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(dungeonMonsterPoolThrough(restored, 1)).toEqual(dungeonMonsterPoolThrough(state, 1));
    expect(state).toEqual(before);
    for (const instance of dungeonMonsterPoolThrough(state, 1))
      expect(combatCardIdForPoolInstance(state, instance.instanceId)).toBe(instance.cardId);
  });

  it("永久移除大型战斗卡排除其两张实体，保留完整来源目录", () => {
    const state = { ...setup(), permanentlyRemovedCombatCardIds: ["monster_large:weald:p001"] };
    const pool = dungeonMonsterPoolThrough(state, 1);
    expect(pool).toHaveLength(43);
    expect(pool.some((card) => card.cardId === "monster_large:weald:p001")).toBe(false);
    expect(state.wealdInstances).toHaveLength(14);
    expect(combatCardIdForPoolInstance(state, "monster-deck:weald:p004")).toBe(
      "monster_large:weald:p001",
    );
  });

  it("按地点解析实体，不让同页码碰撞或遗迹卡进入Weald", () => {
    const state = setup();
    expect(combatCardIdForPoolInstance(state, "monster-deck:p004")).toBeUndefined();
    expect(combatCardIdForPoolInstance(state, "monster-deck:weald:p004")).toBe(
      "monster_large:weald:p001",
    );
    for (const id of [
      "monster-deck:weald:p4",
      "monster-deck:weald:p015",
      "monster-deck:cove:p004",
      "monster_large:weald:p001",
    ])
      expect(combatCardIdForPoolInstance(state, id)).toBeUndefined();
  });

  it("目录缺失、重复、错误引用及部署身份漂移均拒绝", () => {
    for (const field of ["cardId", "edge", "stanceSlots"] as const) {
      const state = setup();
      const entry = state.wealdInstances[0]!;
      if (field === "cardId") entry.cardId = "monster_medium:p001";
      if (field === "edge") entry.edge = "back";
      if (field === "stanceSlots") entry.stanceSlots = 2;
      expect(() => dungeonMonsterPoolThrough(state, 1)).toThrow();
      expect(combatCardIdForPoolInstance(state, entry.instanceId)).toBeUndefined();
    }
    const duplicate = setup();
    duplicate.wealdInstances[1] = duplicate.wealdInstances[0]!;
    expect(() => dungeonMonsterPoolThrough(duplicate, 1)).toThrow();
    const missing = setup();
    missing.wealdInstances.pop();
    expect(() => dungeonMonsterPoolThrough(missing, 1)).toThrow();
    expect(() => dungeonMonsterPoolThrough({ cards: core, location: "weald" }, 1)).toThrow();
    expect(() => dungeonMonsterPoolThrough({ ...setup(), location: "ruins" }, 1)).toThrow();
  });

  it("未核准高等级与未选包拒绝，不回退核心或猜测数值", () => {
    for (const level of [0, 2, 3, 1.5, NaN])
      expect(() => dungeonMonsterPoolThrough(setup(), level)).toThrow();
    expect(() =>
      createWealdLevelOneMonsterPoolState({ ...input(), contentPacks: ["core"] }),
    ).toThrow();
  });

  it("旧状态各等级保持原实例与解析行为，不新增字段", () => {
    const state = { cards: core };
    for (const level of [1, 2, 3])
      expect(dungeonMonsterPoolThrough(state, level)).toEqual(ruinsMonsterPoolThrough(core, level));
    expect(combatCardIdForPoolInstance(state, "monster-deck:p004")).toBe("monster_medium:p004");
    expect(combatCardIdForPoolInstance(state, "monster-deck:weald:p004")).toBeUndefined();
    expect(state).toEqual({ cards: core });
  });
});
