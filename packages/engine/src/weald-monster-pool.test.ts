import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { monsterPoolFileSchema, ruinsMonsterPool } from "../../data/src/monster-pool";
import { buildWealdLevelOneMonsterPool } from "./expansions/weald/monster-pool";
import { buildWealdMonsterCatalog } from "./expansions/weald/monster-catalog";
import { readMonsterAttackView } from "./monster-skill";

const read = (path: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`../../data/normalized/${path}.json`, import.meta.url), "utf8"),
  ) as unknown;
function source() {
  return {
    contentPacks: ["core", "weald"] as const,
    core: monsterPoolFileSchema.parse(read("corebox/monster_pool")).cards,
    medium: read("extension/weald/monster_medium") as {
      cards: { id: string; pages: number[]; copies: number; type_position_tags: string[] }[];
    },
    large: read("extension/weald/monster_large"),
  };
}

describe("Weald I 级当地＋通用怪物池（R9–R10、W3、R-230/R-232）", () => {
  it("31 通用＋14 当地实体，不混遗迹／Boss／高等级卡", () => {
    const input = source();
    const before = structuredClone(input);
    const pool = buildWealdLevelOneMonsterPool(input);
    const common = input.core.filter((card) => card.location === "common" && card.level === 1);
    expect(pool).toHaveLength(45);
    expect(pool.slice(0, 31)).toEqual(
      ruinsMonsterPool(input.core, 1).filter((card) =>
        common.some((entry) => entry.combatCardId === card.cardId),
      ),
    );
    expect(pool.slice(31).map((card) => card.instanceId)).toEqual(
      Array.from({ length: 14 }, (_, i) => `monster-deck:weald:p${String(i + 1).padStart(3, "0")}`),
    );
    expect(new Set(pool.map((card) => card.instanceId)).size).toBe(45);
    expect(pool.filter((card) => card.cardId === "monster_large:weald:p001")).toEqual(
      [4, 5].map((page) => ({
        instanceId: `monster-deck:weald:p00${page}`,
        cardId: "monster_large:weald:p001",
        edge: "front",
        stanceSlots: 2,
        verified: true,
      })),
    );
    expect(
      pool
        .slice(31)
        .filter((card) => card.edge === "back")
        .map((card) => card.instanceId),
    ).toEqual([12, 13, 14].map((page) => `monster-deck:weald:p0${page}`));
    expect(input).toEqual(before);
  });

  it("包未选、目录缺失／重复及前后排漂移均拒绝", () => {
    expect(() => buildWealdLevelOneMonsterPool({ ...source(), contentPacks: ["core"] })).toThrow(
      "未启用",
    );
    const missing = source();
    missing.medium.cards.pop();
    expect(() => buildWealdLevelOneMonsterPool(missing)).toThrow();
    const duplicate = source();
    duplicate.medium.cards[1] = duplicate.medium.cards[0]!;
    expect(() => buildWealdLevelOneMonsterPool(duplicate)).toThrow();
    const edge = source();
    edge.medium.cards[0]!.type_position_tags = ["Eldritch", "Back"];
    expect(() => buildWealdLevelOneMonsterPool(edge)).toThrow("部署身份");
    const core = source();
    core.core.pop();
    expect(() => buildWealdLevelOneMonsterPool(core)).toThrow();
  });

  it("大型抽牌卡映射与三项召唤投影一致", () => {
    const input = source();
    const pool = buildWealdLevelOneMonsterPool(input);
    const battle = buildWealdMonsterCatalog(input.medium, input.large);
    for (const [id, slot, summonId] of [
      ["monster_medium:weald:p001", 2, "monster_medium:weald:p001"],
      ["monster_medium:weald:p001", 3, "monster_large:weald:p001"],
      ["monster_large:weald:p001", 3, "monster_large:weald:p001"],
    ] as const) {
      expect(pool.some((card) => card.cardId === id)).toBe(true);
      expect(
        readMonsterAttackView(
          battle.find((card) => card.id === id)!,
          slot,
        ),
      ).toMatchObject({ status: "ready", wealdSummon: { cardId: summonId, count: 1 } });
    }
  });
});
