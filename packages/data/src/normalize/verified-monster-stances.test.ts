import { describe, expect, it } from "vitest";
import { attachVerifiedMonsterStances, verifiedMonsterStances } from "./verified-monster-stances";
import { loadNormalizedCorebox } from "./write";

const built = loadNormalizedCorebox();
const originals = built.monster_medium.cards.map((card) => {
  const copy = structuredClone(card);
  if ("stanceGroups" in copy) delete copy.stanceGroups;
  return copy;
});

describe("获批怪物姿态映射入库（2026-10-09）", () => {
  it("仅六个获批 id 接入生成层，其他卡和大型卡没有补默认分组", () => {
    const approvedIds = [
      "monster_medium:p001",
      "monster_medium:p004",
      "monster_medium:p007",
      "monster_medium:p010",
      "monster_medium:p021",
      "monster_medium:p040",
    ];
    expect(verifiedMonsterStances.map((entry) => entry.id).sort()).toEqual(approvedIds.sort());
    for (const card of built.monster_medium.cards) {
      const entry = verifiedMonsterStances.find((item) => item.id === card.id);
      if ("skills" in card) expect(card.stanceGroups).toEqual(entry?.stanceGroups);
      else expect("stanceGroups" in card).toBe(false);
    }
    for (const card of built.monster_large.cards) expect(card.stanceGroups).toBeUndefined();
    expect(loadNormalizedCorebox()).toEqual(built);
  });

  it("附加分组只增加该字段，保留 footer、null 数字、验证状态与输入", () => {
    const before = structuredClone(originals);
    const result = attachVerifiedMonsterStances(originals);
    expect(result).toEqual(built.monster_medium.cards);
    const stripped = result.map((card) => {
      const copy = structuredClone(card);
      if ("stanceGroups" in copy) delete copy.stanceGroups;
      return copy;
    });
    expect(stripped).toEqual(before);
    expect(originals).toEqual(before);
    expect(attachVerifiedMonsterStances(originals, [])).toEqual(originals);
    const first = originals.find((card) => card.id === "monster_medium:p001")!;
    const unverified = originals.map((card) =>
      card.id === first.id
        ? { ...card, verification: { unverified: true, reasons: ["icon:pending"] } }
        : card,
    );
    expect(attachVerifiedMonsterStances(unverified)[0]!.verification).toEqual({
      unverified: true,
      reasons: ["icon:pending"],
    });
  });

  it("映射重复 / 未知 id、非技能卡、卡名 / 等级 / 页码漂移均报错", () => {
    const first = verifiedMonsterStances[0]!;
    expect(() => attachVerifiedMonsterStances(originals, [first, first])).toThrow("重复");
    expect(() => attachVerifiedMonsterStances(originals, [{ ...first, id: "missing" }])).toThrow(
      "唯一存在",
    );
    expect(() => attachVerifiedMonsterStances([...originals, originals[0]!])).toThrow("唯一存在");
    const reference = originals.find((card) => !("skills" in card) && card.level === 1)!;
    expect(() =>
      attachVerifiedMonsterStances(originals, [
        { ...first, id: reference.id, name: reference.name, pages: reference.pages },
      ]),
    ).toThrow("大型参考卡");
    for (const patch of [{ name: "Wrong Card" }, { level: 2 }, { pages: [2, 3] }]) {
      expect(() => attachVerifiedMonsterStances(originals, [{ ...first, ...patch }])).toThrow();
    }
  });

  it("入库不能绕过技能唯一引用和姿态 / 骰表校验", () => {
    const first = verifiedMonsterStances[0]!;
    for (const stanceGroups of [
      [{ stances: ["aggressive"], skill: 1 }],
      [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 3 }],
      [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: null }],
      [
        {
          stances: ["aggressive", "defensive", "ranged", "support"],
          rollTable: [{ min: 1, max: 9, skill: 1 }],
        },
      ],
    ])
      expect(() => attachVerifiedMonsterStances(originals, [{ ...first, stanceGroups }])).toThrow();
    const duplicateSkill = originals.map((card) =>
      card.id === first.id && "skills" in card
        ? { ...card, skills: [...card.skills, card.skills[0]!] }
        : card,
    );
    expect(() => attachVerifiedMonsterStances(duplicateSkill)).toThrow("唯一存在");
  });
});
