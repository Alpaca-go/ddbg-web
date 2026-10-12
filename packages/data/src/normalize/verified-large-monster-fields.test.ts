import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import {
  attachVerifiedLargeMonsterFields,
  verifiedLargeMonsterFields,
} from "./verified-large-monster-fields";
import { selectMonsterSkill } from "../../../engine/src/monster-stance";
import type { MonsterStanceCardView } from "../../../engine/src/monster-stance";

const built = loadNormalizedCorebox();
const originals = built.monster_large.cards.map((card) => {
  const copy = structuredClone(card);
  delete copy.speed;
  delete copy.stanceGroups;
  return copy;
});
it("只附加获批L2，M30参考卡与其他大型卡不补值；不修改输入或其他字段", () => {
  const before = structuredClone(originals),
    actual = attachVerifiedLargeMonsterFields(originals);
  expect(actual).toEqual(built.monster_large.cards);
  expect(originals).toEqual(before);
  expect(attachVerifiedLargeMonsterFields(actual)).toEqual(actual);
  expect(attachVerifiedLargeMonsterFields(originals, [])).toEqual(originals);
  expect(actual.filter((c) => c.speed !== undefined).map((c) => c.id)).toEqual([
    "monster_large:p002",
  ]);
  const reference = built.monster_medium.cards.find((c) => c.id === "monster_medium:p030")!;
  expect("speed" in reference).toBe(false);
  expect("stanceGroups" in reference).toBe(false);
  expect(
    actual.map((c) => {
      const copy = structuredClone(c);
      delete copy.speed;
      delete copy.stanceGroups;
      return copy;
    }),
  ).toEqual(before);
});
it("L2全部姿态/d10按印刷表选招，大型两格取高优先姿态", () => {
  const card = built.monster_large.cards.find((c) => c.id === "monster_large:p002")!;
  const expected = {
    aggressive: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3],
    defensive: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
    ranged: Array(10).fill(2),
    support: Array(10).fill(2),
  };
  expect(card.speed).toBe(1);
  const view = JSON.parse(JSON.stringify(card)) as MonsterStanceCardView;
  for (const stance of ["aggressive", "defensive", "ranged", "support"] as const)
    for (let roll = 1; roll <= 10; roll++)
      expect(selectMonsterSkill(view, [stance], roll)).toMatchObject({
        status: "selected",
        skillSlot: expected[stance][roll - 1],
      });
  expect(selectMonsterSkill(view, ["aggressive", "defensive"], 9)).toMatchObject({
    status: "selected",
    skillSlot: 3,
  });
});
it("身份漂移、重复映射、脏Speed、冲突与缺技能引用原子拒绝", () => {
  const entry = verifiedLargeMonsterFields[0]!;
  for (const entries of [
    [entry, entry],
    [{ ...entry, id: "monster_large:p999" }],
    [{ ...entry, name: "wrong" }],
    [{ ...entry, level: 2 }],
    [{ ...entry, pages: [1] }],
    [{ ...entry, speed: null }],
  ])
    expect(() => attachVerifiedLargeMonsterFields(originals, entries)).toThrow();
  expect(() =>
    attachVerifiedLargeMonsterFields(
      originals.map((c) => (c.id === entry.id ? { ...c, speed: 2 } : c)),
    ),
  ).toThrow("冲突");
  expect(() =>
    attachVerifiedLargeMonsterFields(
      originals.map((c) =>
        c.id === entry.id ? { ...c, skills: c.skills.filter((s) => s.slot !== 3) } : c,
      ),
    ),
  ).toThrow("唯一存在");
});
