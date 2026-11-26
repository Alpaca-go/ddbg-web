import { expect, it } from "vitest";
import {
  planPounderIFireInTheHole as fire,
  planPounderIReinforcements as reinforce,
} from "../../../../src/weald/bosses/pounder/pounder-i-combat-plans";

const entity = (id: string, card: string, dead = false, areaId = "B") => ({
  id,
  monsterCardId: card,
  dead,
  areaId,
  side: "monster" as const,
});
const pounder = entity("p", "monster_medium:weald:p020");
const matchman = entity("m", "monster_medium:weald:p023");
const fusilier = (id: string, dead = false) => entity(id, "monster_medium:p027", dead);

it.each([0, 1, 2, 3])("R-258 无 Matchman 时按现有 %i 名 Fusilier 补足，不额外生成两名", (count) => {
  const entities = [
    pounder,
    ...Array.from({ length: count }, (_, i) => fusilier(`f${i}`)),
    fusilier("dead", true),
  ];
  const before = structuredClone(entities);
  expect(reinforce(entities)).toEqual({
    kind: "reinforcements",
    sourceId: "p",
    additions: [
      { cardId: matchman.monsterCardId, count: 1 },
      ...(count < 2 ? [{ cardId: "monster_medium:p027", count: 2 - count }] : []),
    ],
  });
  expect(entities).toEqual(before);
});

it("Matchman 仍在时 Fusilier 全灭也不增援；死亡 Matchman 不阻止增援", () => {
  expect(reinforce([pounder, matchman, fusilier("dead", true)])).toEqual({
    kind: "none",
    reason: "matchmanPresent",
  });
  expect(reinforce([pounder, { ...matchman, dead: true }]).kind).toBe("reinforcements");
  expect(reinforce([{ ...pounder, dead: true }])).toEqual({
    kind: "none",
    reason: "pounderAbsent",
  });
});

it("同区 Matchman 立即触发 Pounder 技能，不把触发当成自动命中", () => {
  const entities = [pounder, matchman];
  const before = structuredClone(entities);
  expect(fire(entities, "m")).toEqual({
    kind: "triggerSkill",
    sourceId: "m",
    actorId: "p",
    cardId: pounder.monsterCardId,
    slot: 1,
  });
  expect(entities).toEqual(before);
  expect(fire([pounder, { ...matchman, areaId: "C" }], "m")).toEqual({
    kind: "none",
    reason: "differentArea",
  });
  expect(fire([matchman], "m")).toEqual({ kind: "none", reason: "pounderAbsent" });
});

it("拒绝错误等级、英雄、尸体、重复实体和缺区域输入", () => {
  for (const actor of [
    { ...matchman, dead: true },
    { ...matchman, side: "hero" as const },
    { ...matchman, monsterCardId: "monster_medium:weald:p024" },
  ])
    expect(() => fire([pounder, actor], "m")).toThrow();
  expect(() => fire([pounder, { ...matchman, areaId: "" }], "m")).toThrow();
  expect(() => reinforce([pounder, pounder])).toThrow();
  expect(() => reinforce([pounder, { ...pounder, id: "p2" }])).toThrow();
});
