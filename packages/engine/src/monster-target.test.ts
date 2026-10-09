import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectMonsterTarget } from "./index";
import type { MonsterTargetCardView, MonsterTargetHero } from "./index";

const cards = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
) as { cards: (MonsterTargetCardView & { id: string; name: string })[] };
function card(name: string) {
  const found = cards.cards.find((entry) => entry.name === name);
  if (!found) throw new Error(`缺少真实怪物卡 ${name}`);
  return found;
}
const heroes: readonly MonsterTargetHero[] = [
  {
    id: "hellion",
    stance: "aggressive",
    areaDistance: 2,
    wounds: 1,
    stress: 2,
    markStacks: 0,
    guard: false,
    dead: false,
  },
  {
    id: "crusader",
    stance: "defensive",
    areaDistance: 2,
    wounds: 4,
    stress: 8,
    markStacks: 0,
    guard: false,
    dead: false,
  },
  {
    id: "vestal",
    stance: "support",
    areaDistance: 0,
    wounds: 2,
    stress: 4,
    markStacks: 0,
    guard: false,
    dead: false,
  },
];
const selected = (targetId: string) => ({ status: "selected", targetId });

describe("怪物单目标优先级（R24、R-024）", () => {
  it("G-04：真实 Defender 技能 3 的 Furthest 平手按姿态选 Hellion", () => {
    const before = structuredClone({ card: card("Bone Defender"), heroes });
    expect(selectMonsterTarget(card("Bone Defender"), 3, heroes)).toEqual(selected("hellion"));
    expect(selectMonsterTarget(card("Bone Defender"), 3, [...heroes].reverse())).toEqual(
      selected("hellion"),
    );
    expect({ card: card("Bone Defender"), heroes }).toEqual(before);
  });

  it("读取真实 Closest / Most Wounded / Most Stressed 文字", () => {
    expect(selectMonsterTarget(card("Bone Defender"), 1, heroes)).toEqual(selected("vestal"));
    expect(selectMonsterTarget(card("Bone Soldier"), 1, heroes)).toEqual(selected("crusader"));
    expect(selectMonsterTarget(card("Bone Courtier"), 1, heroes)).toEqual(selected("crusader"));
  });

  it("伤口与压力比较绝对值；同值按姿态，不按数组顺序", () => {
    const tied = heroes.map((hero) => ({ ...hero, wounds: 4, stress: 8 })).reverse();
    expect(selectMonsterTarget(card("Bone Soldier"), 1, tied)).toEqual(selected("hellion"));
    expect(selectMonsterTarget(card("Bone Courtier"), 1, tied)).toEqual(selected("hellion"));
  });

  it("Marked -> Furthest：有 Mark 按姿态；没有 Mark 才退回 Furthest", () => {
    const arbalist = card("Bone Arbalist");
    expect(selectMonsterTarget(arbalist, 1, heroes)).toEqual(selected("hellion"));
    const marked = heroes.map((hero) => ({
      ...hero,
      markStacks: hero.id === "hellion" ? 0 : 1,
    }));
    expect(selectMonsterTarget(arbalist, 1, marked)).toEqual(selected("crusader"));
    const nearMarked = heroes.map((hero) => ({
      ...hero,
      markStacks: hero.id === "vestal" ? 1 : 0,
    }));
    expect(selectMonsterTarget(arbalist, 1, nearMarked)).toEqual(selected("vestal"));
  });

  it("Guard 优先于 Mark 和距离；目标很远也不换选可达者", () => {
    const guarded = heroes.map((hero) => ({
      ...hero,
      guard: hero.id === "vestal",
      areaDistance: hero.id === "vestal" ? 99 : hero.areaDistance,
      markStacks: hero.id === "hellion" ? 1 : 0,
    }));
    expect(selectMonsterTarget(card("Bone Arbalist"), 1, guarded)).toEqual(selected("vestal"));
    expect(selectMonsterTarget(card("Bone Defender"), 1, guarded)).toEqual(selected("vestal"));
    const multiple = heroes.map((hero) => ({ ...hero, guard: true }));
    expect(selectMonsterTarget(card("Bone Soldier"), 1, multiple)).toEqual(selected("hellion"));
    expect(selectMonsterTarget(card("Bone Courtier"), 1, multiple)).toEqual(selected("hellion"));
    expect(
      selectMonsterTarget(
        card("Bone Arbalist"),
        1,
        multiple.map((hero) => ({ ...hero, markStacks: hero.id === "vestal" ? 1 : 0 })),
      ),
    ).toEqual(selected("hellion"));
  });

  it("死亡英雄不参与优先级或 Guard；全灭拒绝", () => {
    const dead = heroes.map((hero) => ({
      ...hero,
      dead: hero.id === "crusader",
      guard: hero.id === "crusader",
    }));
    expect(selectMonsterTarget(card("Bone Soldier"), 1, dead)).toEqual(selected("vestal"));
    expect(
      selectMonsterTarget(
        card("Bone Soldier"),
        1,
        heroes.map((hero) => ({ ...hero, dead: true })),
      ).status,
    ).toBe("refused");
  });

  it("未验证卡、缺失 / 重复技能与未支持目标保持拒绝，不补默认值", () => {
    const source = card("Bone Soldier");
    expect(
      selectMonsterTarget({ ...source, verification: { unverified: true } }, 1, heroes).status,
    ).toBe("refused");
    for (const slot of [0, 3, 4, 1.5])
      expect(selectMonsterTarget(source, slot, heroes).status).toBe("refused");
    expect(
      selectMonsterTarget({ ...source, skills: [source.skills[0]!, source.skills[0]!] }, 1, heroes)
        .status,
    ).toBe("refused");
    for (const target of [null, "Crowded", "Self", "Unknown", "Marked -> Unknown"])
      expect(
        selectMonsterTarget({ ...source, skills: [{ slot: 1, target }] }, 1, heroes).status,
      ).toBe("refused");
  });

  it("缺少或非法数值、重复 ID / 姿态拒绝，不随机打破平手", () => {
    for (const patch of [
      { areaDistance: NaN },
      { areaDistance: -1 },
      { wounds: -1 },
      { stress: 11 },
      { markStacks: undefined },
    ]) {
      const invalid = [{ ...heroes[0]!, ...patch }, ...heroes.slice(1)] as MonsterTargetHero[];
      expect(selectMonsterTarget(card("Bone Soldier"), 1, invalid).status).toBe("refused");
    }
    expect(selectMonsterTarget(card("Bone Soldier"), 1, [heroes[0]!, heroes[0]!]).status).toBe(
      "refused",
    );
    expect(
      selectMonsterTarget(card("Bone Soldier"), 1, [
        heroes[0]!,
        { ...heroes[1]!, stance: "aggressive" },
      ]).status,
    ).toBe("refused");
  });
});
