import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { normalizedMonsterMediumCardSchema } from "./schema";

const groups = [
  {
    stances: ["aggressive", "defensive"],
    rollTable: [
      { min: 1, max: 5, skill: 2 },
      { min: 6, max: 10, skill: 1 },
    ],
  },
  { stances: ["ranged", "support"], skill: 3 },
];

describe("姿态选招数据 schema（R-015）", () => {
  it("接收固定 / 骰表分组，顺序不影响相邻验证，不添加默认值", () => {
    expect(monsterStanceGroupsSchema.parse(groups)).toEqual(groups);
    expect(monsterStanceGroupsSchema.safeParse([...groups].reverse()).success).toBe(true);
  });

  it("拒绝缺失姿态、重复或非相邻分组", () => {
    for (const input of [
      [],
      [groups[0]],
      [{ stances: ["aggressive", "aggressive", "defensive", "ranged", "support"], skill: 1 }],
      [
        { stances: ["aggressive", "ranged"], skill: 1 },
        { stances: ["defensive", "support"], skill: 2 },
      ],
    ])
      expect(monsterStanceGroupsSchema.safeParse(input).success).toBe(false);
  });

  it("拒绝骰表缺口、重叠、倒置、null、未知标签与同时提供两种标签", () => {
    for (const label of [
      { rollTable: [{ min: 1, max: 9, skill: 1 }] },
      {
        rollTable: [
          { min: 1, max: 6, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
      { rollTable: [{ min: 10, max: 1, skill: 1 }] },
      { rollTable: [{ min: null, max: 10, skill: 1 }] },
      { skill: null },
      { skill: 4 },
      { unknown: 1 },
      { skill: 1, rollTable: [{ min: 1, max: 10, skill: 2 }] },
    ])
      expect(
        monsterStanceGroupsSchema.safeParse([
          { stances: ["aggressive", "defensive", "ranged", "support"], ...label },
        ]).success,
      ).toBe(false);
  });

  it("旧规范化卡保持兼容；新增分组必须引用卡上唯一存在的技能", () => {
    const file = JSON.parse(
      readFileSync(
        new URL("../../normalized/corebox/monster_medium.json", import.meta.url),
        "utf8",
      ),
    ) as { cards: Record<string, unknown>[] };
    const card = file.cards.find((entry) => entry.name === "Bone Defender")!;
    expect(normalizedMonsterMediumCardSchema.safeParse(card).success).toBe(true);
    expect(
      normalizedMonsterMediumCardSchema.safeParse({ ...card, stanceGroups: groups }).success,
    ).toBe(true);
    expect(
      normalizedMonsterMediumCardSchema.safeParse({ ...card, skills: [], stanceGroups: groups })
        .success,
    ).toBe(false);
    const skills = card.skills as Record<string, unknown>[];
    expect(
      normalizedMonsterMediumCardSchema.safeParse({
        ...card,
        skills: [...skills, skills[0]],
        stanceGroups: groups,
      }).success,
    ).toBe(false);
  });
});
