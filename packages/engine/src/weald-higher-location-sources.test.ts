import { describe, expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curios from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import { coreQuestSources } from "./test-helpers/core-quest";
import { rebuildLocationQuestDecks } from "./location-quest-sources";
import { combatCardIdForPoolInstance, dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { monsterPoolCatalogValidForLocation } from "./monster-pool-validation";
import type { createWealdHigherMonsterPoolState } from "./expansions/weald/higher-monster-pool";
type TestPool = Omit<ReturnType<typeof createWealdHigherMonsterPoolState>, "wealdSourceVersion"> & {
  wealdSourceVersion?: "higher-v1";
};

const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};
const packs = ["core", "weald"] as const;
const build = (level: 2 | 3) =>
  rebuildLocationQuestDecks(sources, "weald", level, packs, "weald-higher-v1");

describe("R-263／R-264 高等级地点来源的显式版本", () => {
  it.each([2, 3] as const)("%i 级完整当地＋同级通用；序列化后重建目录与实例一致", (level) => {
    const decks = build(level);
    const pool = decks.monsterPool;
    expect(monsterPoolCatalogValidForLocation(pool, "weald", level)).toBe(true);
    const instances = dungeonMonsterPoolThrough(pool, level);
    const local = instances.filter((i) => i.instanceId.includes(":weald:"));
    expect(local).toHaveLength(level === 2 ? 3 : 2);
    for (const instance of instances) {
      expect(decks.catalog.monsters.filter((c) => c.id === instance.cardId)).toHaveLength(1);
      expect(combatCardIdForPoolInstance(pool, instance.instanceId)).toBe(instance.cardId);
    }
    const common = new Set(
      sources.monsters
        .filter((c) => c.level === level && c.location === "common")
        .map((c) => c.combatCardId),
    );
    expect(
      instances.filter((i) => !i.instanceId.includes(":weald:")).every((i) => common.has(i.cardId)),
    ).toBe(true);
    expect(decks.curios).toHaveLength(24);
    const restored = JSON.parse(JSON.stringify(decks)) as typeof decks;
    expect(dungeonMonsterPoolThrough(restored.monsterPool, level)).toEqual(instances);
    expect(build(level)).toEqual(decks);
    expect(sources.weald.medium).toEqual(medium);
  });
  it("旧调用不自动升级；包、版本、等级或实体身份篡改被拒绝", () => {
    expect(() => rebuildLocationQuestDecks(sources, "weald", 2, packs)).toThrow();
    expect(() =>
      rebuildLocationQuestDecks(sources, "weald", 2, ["core"], "weald-higher-v1"),
    ).toThrow();
    for (const mutate of [
      (p: TestPool) => {
        delete p.wealdSourceVersion;
      },
      (p: TestPool) => {
        p.wealdMonsterLevel = 3;
      },
      (p: TestPool) => {
        p.wealdInstances!.pop();
      },
      (p: TestPool) => {
        p.wealdInstances![0]!.cardId = "monster_medium:weald:p018";
      },
    ]) {
      const pool = structuredClone(build(2).monsterPool) as TestPool;
      mutate(pool);
      expect(monsterPoolCatalogValidForLocation(pool, "weald", 2)).toBe(false);
    }
    const pool = build(2).monsterPool;
    expect(monsterPoolCatalogValidForLocation(pool, "ruins", 2)).toBe(false);
    expect(monsterPoolCatalogValidForLocation(pool, "weald", 3)).toBe(false);
    expect(combatCardIdForPoolInstance(pool, "monster-deck:weald:p018")).toBeUndefined();
  });
  it("I 级旧来源输出不携带新版本；切回遗迹不残留扩展实例", () => {
    const old = rebuildLocationQuestDecks(sources, "weald", 1, packs);
    expect(old.monsterPool).not.toHaveProperty("wealdSourceVersion");
    expect(
      dungeonMonsterPoolThrough(old.monsterPool, 1).filter((i) => i.instanceId.includes(":weald:")),
    ).toHaveLength(14);
    const ruins = rebuildLocationQuestDecks(sources, "ruins", 2, packs);
    expect(ruins.monsterPool).not.toHaveProperty("wealdInstances");
    expect(monsterPoolCatalogValidForLocation(ruins.monsterPool, "ruins", 2)).toBe(true);
  });
});
