import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
it("C-017：Fanatic I 生成结果与提交数据一致，三招完整效果均有计划", () => {
  const committed = JSON.parse(
    readFileSync(new URL("../../normalized/corebox/monster_large.json", import.meta.url), "utf8"),
  );
  const generated = built.monster_large.cards.find((c) => c.id === "monster_large:p008")!;
  expect(generated).toEqual(committed.cards.find((c: { id: string }) => c.id === generated.id));
  expect(generated.skills.map((s) => s.verified_monster_effects?.effects.length)).toEqual([
    2, 3, 1,
  ]);
});
it("只附加已核实大型卡，参考卡与其他卡不补值；不修改输入或其他字段", () => {
  const before = structuredClone(originals),
    actual = attachVerifiedLargeMonsterFields(originals);
  expect(actual).toEqual(built.monster_large.cards);
  expect(originals).toEqual(before);
  expect(attachVerifiedLargeMonsterFields(actual)).toEqual(actual);
  expect(attachVerifiedLargeMonsterFields(originals, [])).toEqual(originals);
  expect(actual.filter((c) => c.speed !== undefined).map((c) => c.id)).toEqual([
    "monster_large:p001",
    "monster_large:p002",
    "monster_large:p003",
    "monster_large:p008",
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
it("R-083 Captain/Ghoul四姿态全部骰面符合独立印刷表，大型取占用前姿态", () => {
  for (const [id, speed, a, s] of [
    ["monster_large:p001", 1, [1, 1, 1, 1, 1, 1, 2, 2, 2, 2], Array(10).fill(2)],
    ["monster_large:p003", 2, [1, 1, 1, 1, 2, 2, 2, 3, 3, 3], [2, 2, 2, 2, 2, 3, 3, 3, 3, 3]],
  ] as const) {
    const card = built.monster_large.cards.find((c) => c.id === id)!;
    const view = { ...card, stanceGroups: card.stanceGroups! };
    expect(card.speed).toBe(speed);
    for (const stance of ["aggressive", "defensive", "ranged", "support"] as const)
      for (let roll = 1; roll <= 10; roll++) {
        const expected =
          stance === "support" || (id.endsWith("p001") && stance === "ranged") ? s : a;
        expect(selectMonsterSkill(view, [stance], roll)).toMatchObject({
          status: "selected",
          skillSlot: expected[roll - 1],
        });
      }
    expect(selectMonsterSkill(view, ["support", "ranged"], 1)).toMatchObject({
      status: "selected",
      skillSlot: id.endsWith("p001") ? 2 : 1,
    });
  }
});
it("身份漂移、重复映射、脏Speed、冲突与缺技能引用原子拒绝", () => {
  const entry = verifiedLargeMonsterFields.find((e) => e.id === "monster_large:p002")!;
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
