import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveMonsterSkill } from "./index";
import type { MonsterCardView, MonsterCombatState, MonsterSkillResolution } from "./index";

const cards = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
) as { cards: MonsterCardView[] };
function card(page = "p001"): MonsterCardView {
  const found = cards.cards.find((entry) => entry.id === `monster_medium:${page}`);
  if (!found) throw new Error(`缺少怪物 ${page}`);
  return found;
}
const combat: MonsterCombatState = {
  actor: { id: "soldier", wounds: 0 },
  target: { id: "hero", side: "hero", wounds: 1, dodge: 1, stress: 5 },
  areaDistance: 1,
  untargetedHeroesBesideTarget: [{ id: "other", stress: 3 }],
};
function resolved(result: MonsterSkillResolution) {
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") throw new Error(result.reason);
  return result.resolution;
}
function use(patch: Partial<MonsterCombatState>, roll: number, slot = 1, page = "p001") {
  return resolveMonsterSkill(card(page), slot, { ...combat, ...patch }, roll);
}

describe("已选怪物攻击的纯结算（R19–21）", () => {
  it("从真实 Bone Soldier 卡读取伤害，命中 / 落空，不改入参", () => {
    const before = structuredClone({ card: card(), combat });
    expect(resolved(use({}, 8))).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 6,
      actorWounds: 0,
      actorStress: null,
      targetStress: 5,
    });
    expect(resolved(use({}, 9))).toMatchObject({ outcome: "miss", wounds: 1, damageDealt: null });
    expect({ card: card(), combat }).toEqual(before);
    expect(use({}, 8)).toEqual(use({}, 8));
  });

  it("暴击不减 Dodge；只有受击英雄及同区未选英雄加压，怪物不减压（R-031）", () => {
    expect(resolved(use({ target: { ...combat.target, dodge: 20 } }, 1))).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      wounds: 10,
      actorStress: null,
      besideActorStress: null,
      targetStress: 6,
      untargetedBesideTargetStress: [{ id: "other", stress: 4 }],
    });
  });

  it("已有 Buff 与英雄敌人的 Debuff / Mark 按堆数修正（R-016、R-019）", () => {
    expect(
      resolved(
        use(
          {
            actor: { ...combat.actor, buffStacks: 1 },
            target: { ...combat.target, debuffStacks: 1, dodge: 20 },
          },
          3,
        ),
      ).outcome,
    ).toBe("crit");
    expect(resolved(use({ target: { ...combat.target, markStacks: 1 } }, 9)).outcome).toBe("hit");
    expect(resolved(use({ target: { ...combat.target, debuffStacks: 1 } }, 9)).outcome).toBe(
      "miss",
    );
  });

  it("光照 5 Dodge、4–0 Crit，以及 0 怪物 Acc 逐项生效（R-002）", () => {
    expect(resolved(use({ light: 5 }, 8)).outcome).toBe("miss");
    expect(resolved(use({ light: 4 }, 2)).outcome).toBe("crit");
    expect(resolved(use({ light: 1 }, 9)).outcome).toBe("miss");
    expect(resolved(use({ light: 0 }, 9)).outcome).toBe("hit");
  });

  it("低光照承受暴击每个压力事件额外 +1，封顶 10，不递归加压（R-002）", () => {
    expect(resolved(use({ light: 2 }, 1))).toMatchObject({
      targetStress: 7,
      untargetedBesideTargetStress: [{ id: "other", stress: 5 }],
    });
    expect(
      resolved(
        use(
          {
            light: 0,
            target: { ...combat.target, stress: 9 },
            untargetedHeroesBesideTarget: [{ id: "other", stress: 10 }],
          },
          1,
        ),
      ),
    ).toMatchObject({
      targetStress: 10,
      untargetedBesideTargetStress: [{ id: "other", stress: 10 }],
    });
  });

  it("Protection 只减伤一次；Riposte 按减伤前向上取半，可杀死攻击怪物（R-017）", () => {
    const result = use(
      {
        actor: { ...combat.actor, wounds: 4, protection: true, riposte: true },
        target: { ...combat.target, protection: true, riposte: true },
      },
      8,
    );
    expect(result).toMatchObject({ status: "resolved", actorDead: true });
    expect(resolved(result)).toMatchObject({
      damageDealt: 3,
      wounds: 4,
      riposteDamage: 3,
      actorWounds: 7,
    });
    expect(use({ target: { ...combat.target, riposte: true } }, 9)).toMatchObject({
      actorDead: false,
    });
  });

  it("G-04：Bone Defender 技能 3，Acc 5−Dodge 1 命中伤害 3，自身 Pull 1（R22–23）", () => {
    expect(resolved(use({}, 4, 3, "p010"))).toMatchObject({
      outcome: "hit",
      damageDealt: 3,
      wounds: 4,
      actorShuffle: { direction: "pull", distance: 1 },
    });
    expect(resolved(use({}, 5, 3, "p010"))).toMatchObject({
      outcome: "miss",
      wounds: 1,
      actorShuffle: { direction: "pull", distance: 1 },
    });
  });

  it("更低区域射程与命中 +1；距离或 Guard 不合法时自身效果也不发生（R-022、R-024）", () => {
    expect(resolved(use({ areaDistance: 2, targetAreaLower: true }, 9)).outcome).toBe("hit");
    expect(use({ areaDistance: 2 }, 4, 2)).toMatchObject({ status: "refused" });
    expect(use({ guardedHeroOmitted: true }, 4, 2)).toMatchObject({ status: "refused" });
  });

  it("Courtier 明确复核 +1 压力；Arbalist 明确复核 +1 vs Mark（R-048）", () => {
    expect(resolved(use({ areaDistance: 2 }, 4, 1, "p004"))).toMatchObject({
      damageDealt: 3,
      targetStress: 6,
      skipped: [],
    });
    expect(
      resolved(use({ areaDistance: 2, target: { ...combat.target, markStacks: 1 } }, 4, 1, "p007")),
    ).toMatchObject({
      damageDealt: 6,
      skipped: [],
    });
  });

  it("Courtier 只在命中加压；低光照技能和暴击各是一次压力事件（R-002）", () => {
    expect(resolved(use({ areaDistance: 2, light: 4 }, 10, 1, "p004"))).toMatchObject({
      outcome: "miss",
      targetStress: 5,
    });
    expect(resolved(use({ areaDistance: 2, light: 4 }, 1, 1, "p004"))).toMatchObject({
      targetStress: 7,
      untargetedBesideTargetStress: [{ id: "other", stress: 4 }],
    });
    expect(resolved(use({ areaDistance: 2, light: 2 }, 1, 1, "p004"))).toMatchObject({
      targetStress: 9,
      untargetedBesideTargetStress: [{ id: "other", stress: 5 }],
    });
    expect(resolved(use({ areaDistance: 2, light: 2 }, 4, 1, "p004"))).toMatchObject({
      targetStress: 7,
    });
  });

  it("Courtier 无压力注解仍跳过；注解数值与卡面漂移时拒绝整次", () => {
    const original = card("p004");
    const legacy = {
      ...original,
      skills: original.skills.map((skill) => {
        const { verified_target_stress, ...without } = skill;
        if (skill.slot === 1) expect(verified_target_stress).toBeDefined();
        return without;
      }),
    };
    expect(
      resolved(resolveMonsterSkill(legacy, 1, { ...combat, areaDistance: 2 }, 4)),
    ).toMatchObject({ targetStress: 5, skipped: [{ code: "effect_lines" }] });
    const changed = {
      ...original,
      skills: original.skills.map((skill) =>
        skill.slot === 1
          ? { ...skill, verified_target_stress: { ...skill.verified_target_stress!, amount: 2 } }
          : skill,
      ),
    };
    expect(resolveMonsterSkill(changed, 1, { ...combat, areaDistance: 2 }, 4).status).toBe(
      "refused",
    );
  });

  it("真实大型普通怪 Bone Captain 使用同一算法，不引入 Boss 逻辑", () => {
    const large = JSON.parse(
      readFileSync(
        new URL("../../data/normalized/corebox/monster_large.json", import.meta.url),
        "utf8",
      ),
    ) as { cards: MonsterCardView[] };
    const captain = large.cards.find((entry) => entry.id === "monster_large:p001")!;
    expect(resolved(resolveMonsterSkill(captain, 1, combat, 4))).toMatchObject({
      outcome: "hit",
      damageDealt: 11,
      wounds: 12,
    });
  });

  it("真实 Rend for the Old Gods 的 Bleed 回合数未核实，仍报告跳过，不放代币", () => {
    expect(resolved(use({}, 4, 1, "p018")).skipped).toContainEqual({ code: "effect_lines" });
  });

  it("效果框中的目标图标不会混入攻击阵营与目标数", () => {
    const modified = structuredClone(card());
    const effect = [
      { type: "icon" as const, icon: { key: "target_monster", naming: "confirmed" } },
    ];
    const skill = {
      ...modified.skills[0]!,
      effect_lines: [effect],
      lines: [...modified.skills[0]!.lines, effect],
    };
    expect(
      resolved(resolveMonsterSkill({ ...modified, skills: [skill] }, 1, combat, 4)),
    ).toMatchObject({
      outcome: "hit",
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      resolveMonsterSkill(
        { ...modified, skills: [{ ...skill, lines: [...skill.lines, effect] }] },
        1,
        combat,
        4,
      ),
    ).toMatchObject({ status: "refused" });
  });

  it("未核实卡、空 / 重复技能、null 数字与未命名伤害均拒绝（R-048）", () => {
    const base = card();
    for (const modified of [
      { ...base, verification: { unverified: true } },
      { ...base, life: 0 },
      { ...base, skills: [] },
      { ...base, skills: [base.skills[0]!, base.skills[0]!] },
      {
        ...base,
        skills: [
          {
            ...base.skills[0]!,
            unlabeled_numbers: base.skills[0]!.unlabeled_numbers.map((number) => ({
              ...number,
              numeric: null,
            })),
          },
        ],
      },
      { ...base, skills: [{ ...base.skills[0]!, lines: [] }] },
    ])
      expect(resolveMonsterSkill(modified, 1, combat, 4)).toMatchObject({ status: "refused" });
    for (const slot of [0, 4, 1.5])
      expect(resolveMonsterSkill(base, slot, combat, 4)).toMatchObject({ status: "refused" });
  });

  it("非法骰面 / 状态、同一实体、死亡怪物与未核实英雄 Life 拒绝", () => {
    for (const roll of [0, 11, 1.5]) expect(use({}, roll)).toMatchObject({ status: "refused" });
    for (const patch of [
      { actor: { ...combat.actor, wounds: 7 } },
      { actor: { ...combat.actor, stress: 3 } },
      { target: { ...combat.target, side: "monster" as const } },
      { target: { ...combat.target, id: combat.actor.id } },
      { target: { ...combat.target, life: 20 } },
      { target: { ...combat.target, debuffStacks: -1 } },
      { target: { ...combat.target, stress: undefined } },
      { areaDistance: undefined },
      { light: 6 },
    ])
      expect(use(patch as unknown as Partial<MonsterCombatState>, 4)).toMatchObject({
        status: "refused",
      });
  });
});
