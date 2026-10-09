import { describe, expect, it } from "vitest";
import { createRng, rollD10, selectMonsterSkill } from "./index";
import type { MonsterStanceCardView, MonsterStanceGroup, SkillStance } from "./index";

// 规则书 R22 / 说明书 §6.10 示例；仅作黄金夹具，不回填真实游戏数据。
const defender: MonsterStanceCardView = {
  verification: { unverified: false },
  skills: [{ slot: 1 }, { slot: 2 }, { slot: 3 }],
  stanceGroups: [
    {
      stances: ["aggressive", "defensive"],
      rollTable: [
        { min: 1, max: 5, skill: 2 },
        { min: 6, max: 10, skill: 1 },
      ],
    },
    { stances: ["ranged", "support"], skill: 3 },
  ],
};
const selected = (skillSlot: number, roll: number | null = null) => ({
  status: "selected",
  skillSlot,
  roll,
});

describe("怪物姿态选招（R-015、R17、R22、R24）", () => {
  it("Defender 远程 / 支援固定用技能 3，不需要选招骰", () => {
    expect(selectMonsterSkill(defender, ["ranged"])).toEqual(selected(3));
    expect(selectMonsterSkill(defender, ["support"], 10)).toEqual(selected(3));
  });

  it("Defender 进攻 / 防御先请求骰面，再按完整区间选择", () => {
    for (const stance of ["aggressive", "defensive"] as const) {
      expect(selectMonsterSkill(defender, [stance])).toEqual({ status: "needsRoll", stance });
      for (let roll = 1; roll <= 10; roll++)
        expect(selectMonsterSkill(defender, [stance], roll)).toEqual(
          selected(roll <= 5 ? 2 : 1, roll),
        );
    }
  });

  it("R24 Acolyte 的三段骰表边界", () => {
    const acolyte: MonsterStanceCardView = {
      ...defender,
      stanceGroups: [
        {
          stances: ["aggressive"],
          rollTable: [
            { min: 1, max: 5, skill: 1 },
            { min: 6, max: 10, skill: 3 },
          ],
        },
        {
          stances: ["defensive", "ranged", "support"],
          rollTable: [
            { min: 1, max: 4, skill: 1 },
            { min: 5, max: 7, skill: 2 },
            { min: 8, max: 10, skill: 3 },
          ],
        },
      ],
    };
    for (const [roll, slot] of [
      [1, 1],
      [4, 1],
      [5, 2],
      [7, 2],
      [8, 3],
      [10, 3],
    ])
      expect(selectMonsterSkill(acolyte, ["support"], roll)).toEqual(selected(slot!, roll!));
  });

  it("大型怪跨分组读取优先级较高的姿态，不依赖输入顺序", () => {
    expect(selectMonsterSkill(defender, ["ranged", "defensive"], 5)).toEqual(selected(2, 5));
    expect(selectMonsterSkill(defender, ["defensive", "ranged"], 6)).toEqual(selected(1, 6));
    expect(selectMonsterSkill(defender, ["ranged", "support"])).toEqual(selected(3));
  });

  it("同种子选招回放确定，函数不修改卡牌、姿态或消耗 RNG", () => {
    const before = structuredClone(defender);
    const run = () => {
      const rng = createRng(42);
      return Array.from({ length: 10 }, () =>
        selectMonsterSkill(defender, ["aggressive"], rollD10(rng)),
      );
    };
    expect(run()).toEqual(run());
    expect(defender).toEqual(before);
  });

  it("未验证卡、缺少分组、非法姿态占格与骰面拒绝", () => {
    expect(
      selectMonsterSkill({ ...defender, verification: { unverified: true } }, ["ranged"]).status,
    ).toBe("refused");
    expect(
      selectMonsterSkill({ verification: defender.verification, skills: defender.skills }, [
        "ranged",
      ]).status,
    ).toBe("refused");
    for (const occupied of [
      [],
      ["aggressive", "ranged"],
      ["ranged", "ranged"],
      ["unknown"],
      ["aggressive", "defensive", "ranged"],
    ])
      expect(selectMonsterSkill(defender, occupied as SkillStance[]).status).toBe("refused");
    for (const roll of [0, 11, 1.5, NaN])
      expect(selectMonsterSkill(defender, ["aggressive"], roll).status).toBe("refused");
  });

  it("分组缺口 / 重复 / 不相邻及缺失 / 重复技能拒绝，包括未选分组", () => {
    const fixed = (stances: readonly SkillStance[], skill = 1): MonsterStanceGroup => ({
      stances,
      skill,
    });
    for (const groups of [
      [fixed(["aggressive", "defensive"])],
      [fixed(["aggressive", "ranged"]), fixed(["defensive", "support"])],
      [fixed(["aggressive", "defensive"]), fixed(["defensive", "ranged", "support"])],
      [fixed(["aggressive", "defensive", "ranged", "support"], 4)],
    ])
      expect(selectMonsterSkill({ ...defender, stanceGroups: groups }, ["aggressive"]).status).toBe(
        "refused",
      );
    for (const skills of [[{ slot: 3 }], [{ slot: 1 }, { slot: 1 }, { slot: 2 }, { slot: 3 }]])
      expect(selectMonsterSkill({ ...defender, skills }, ["ranged"]).status).toBe("refused");
  });

  it("骰表倒置、缺口、重叠、null 数字与双标签拒绝，不补默认值", () => {
    for (const rollTable of [
      [{ min: 1, max: 9, skill: 1 }],
      [
        { min: 1, max: 6, skill: 1 },
        { min: 6, max: 10, skill: 2 },
      ],
      [{ min: 10, max: 1, skill: 1 }],
      [{ min: null, max: 10, skill: 1 }],
    ]) {
      const group = {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable,
      } as unknown as MonsterStanceGroup;
      expect(
        selectMonsterSkill({ ...defender, stanceGroups: [group] }, ["aggressive"], 1).status,
      ).toBe("refused");
    }
    const both = {
      stances: ["aggressive", "defensive", "ranged", "support"],
      skill: 1,
      rollTable: [{ min: 1, max: 10, skill: 2 }],
    } as unknown as MonsterStanceGroup;
    expect(selectMonsterSkill({ ...defender, stanceGroups: [both] }, ["aggressive"]).status).toBe(
      "refused",
    );
  });
});
