import { describe, expect, it } from "vitest";
import { spawnMonsters } from "./spawn";
import type { SpawnCard } from "./spawn";
const starts = { aggressive: "J", defensive: "D", ranged: "F", support: "D" } as const;
const card = (
  instanceId: string,
  edge: "front" | "back" = "front",
  stanceSlots: 1 | 2 = 1,
): SpawnCard => ({
  instanceId,
  cardId: stanceSlots === 2 ? "verified-large-fixture" : "verified-small-fixture",
  edge,
  stanceSlots,
  verified: true,
});
describe("R17 / R-029 / R-052 / R-058 正式生成", () => {
  it("前排从前、后排从后，四格满停止，不多抽；F 孤立起点仍 F", () => {
    const deck = [card("a"), card("b", "back"), card("c"), card("d", "back"), card("unused")];
    const before = structuredClone(deck);
    const result = spawnMonsters(deck, starts);
    expect(result).toEqual(spawnMonsters(deck, starts));
    expect(deck).toEqual(before);
    expect(result).toMatchObject({
      type: "spawned",
      drawn: 4,
      discarded: [],
      remaining: [card("unused")],
    });
    if (result.type === "spawned")
      expect(
        result.monsters.map((entry) => [entry.instanceId, entry.stance, entry.areaId]),
      ).toEqual([
        ["a", "aggressive", "J"],
        ["b", "support", "D"],
        ["c", "defensive", "D"],
        ["d", "ranged", "F"],
      ]);
  });
  it("大型怪双格按高优先姿态，后排占前一格；两只大怪只两张先攻", () => {
    const result = spawnMonsters(
      [card("back", "back", 2), card("front", "front", 2), card("unused")],
      starts,
    );
    expect(result).toMatchObject({ type: "spawned", drawn: 2, remaining: [card("unused")] });
    if (result.type === "spawned")
      expect(
        result.monsters.map((entry) => [entry.stance, entry.areaId, entry.stanceSlots]),
      ).toEqual([
        ["ranged", "F", 2],
        ["aggressive", "J", 2],
      ]);
  });
  it("大怪放不下弃最后生成的小怪，必要时向前紧凑，所有棋子按最终姿态部署", () => {
    const result = spawnMonsters(
      [card("small"), card("old", "front", 2), card("new", "front", 2)],
      starts,
    );
    expect(result).toMatchObject({
      type: "spawned",
      drawn: 3,
      discarded: [card("small")],
      remaining: [],
    });
    if (result.type === "spawned")
      expect(
        result.monsters.map((entry) => [entry.instanceId, entry.stance, entry.areaId]),
      ).toEqual([
        ["old", "aggressive", "J"],
        ["new", "ranged", "F"],
      ]);
    const three = spawnMonsters(
      [card("a"), card("b", "back"), card("c"), card("large", "front", 2)],
      starts,
    );
    if (three.type === "spawned") {
      expect(three.discarded).toEqual([card("c")]);
      expect(three.monsters.map((entry) => [entry.instanceId, entry.stance])).toEqual([
        ["a", "aggressive"],
        ["b", "support"],
        ["large", "defensive"],
      ]);
    } else throw Error(three.reason);
  });
  it("牌堆空即停，留空格；未知前后排 / 大小 / 起点和重复实例拒绝", () => {
    expect(spawnMonsters([], starts)).toEqual({
      type: "spawned",
      monsters: [],
      discarded: [],
      remaining: [],
      drawn: 0,
    });
    expect(spawnMonsters([card("a")], starts)).toMatchObject({ type: "spawned", drawn: 1 });
    expect(spawnMonsters([card("a"), card("a")], starts).type).toBe("refused");
    expect(spawnMonsters([{ ...card("a"), verified: false }], starts).type).toBe("refused");
    expect(spawnMonsters([card("a")], { ...starts, ranged: "" }).type).toBe("refused");
    for (const stanceSlots of [undefined, 0, 3])
      expect(
        spawnMonsters([{ ...card("a"), stanceSlots } as unknown as SpawnCard], starts).type,
      ).toBe("refused");
  });
});
