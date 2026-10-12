import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { readMonsterAttackView, resolveMonsterSkill } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
import { readPrintedRange, readPrintedTargets } from "./hero-skill";

const cards: MonsterCardView[] = ["medium", "large"].flatMap(
  (kind) =>
    JSON.parse(
      readFileSync(
        new URL(`../../data/normalized/corebox/monster_${kind}.json`, import.meta.url),
        "utf8",
      ),
    ).cards,
);
const byId = (id: string) => cards.find((c) => c.id === id)!;
const combat = {
  actor: { id: "monster", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
  areaDistance: 0,
  light: 5,
};
describe("怪物复合效果原语（R20–21 / R27–28）", () => {
  it("所有有计划且不含疾病的真实 I 级技能完整结算，原始数据保持不变", () => {
    const before = structuredClone(cards);
    let checked = 0;
    for (const card of cards)
      for (const skill of card.skills ?? []) {
        if (
          !skill.verified_monster_effects ||
          skill.verified_monster_effects.effects.some((e) => e.type === "disease")
        )
          continue;
        const attack = readMonsterAttackView(card, skill.slot);
        expect(attack.status, `${card.id}/${skill.slot}`).toBe("ready");
        if (attack.status !== "ready") throw new Error(attack.reason);
        const range = readPrintedRange(attack.view),
          targets = readPrintedTargets(attack.view);
        if (range.kind !== "exact" || targets.kind !== "exact") throw new Error("缺少射程 / 目标");
        for (const roll of [1, 5, 10]) {
          const result = resolveMonsterSkill(
            card,
            skill.slot,
            { ...combat, areaDistance: range.distance, targetsInArea: targets.max },
            roll,
          );
          expect(result.status, `${card.id}/${skill.slot}/${roll}`).toBe("resolved");
          if (result.status === "resolved") expect(result.resolution.skipped).toEqual([]);
        }
        checked++;
      }
    expect(checked).toBe(18);
    expect(cards).toEqual(before);
  });
  it("注解数值 / 范围或原始行漂移原子拒绝，不能靠更新签名放行", () => {
    const card = structuredClone(byId("monster_medium:p034"));
    const skill = card.skills[0]!;
    const plan = skill.verified_monster_effects!;
    for (const effects of [
      plan.effects.slice(1),
      plan.effects.map((e) => (e.type === "status" ? { ...e, duration: 7 } : e)),
      plan.effects.map((e) => (e.type === "status" ? { ...e, scope: "self" as const } : e)),
    ]) {
      expect(
        readMonsterAttackView(
          { ...card, skills: [{ ...skill, verified_monster_effects: { ...plan, effects } }] },
          skill.slot,
        ).status,
      ).toBe("refused");
    }
    expect(
      readMonsterAttackView(
        {
          ...card,
          skills: [{ ...skill, verified_monster_effects: { ...plan, signatures: ["wrong"] } }],
        },
        skill.slot,
      ).status,
    ).toBe("refused");
  });
  it("Maggot 命中保存疾病原语，落空不感染；纯结算不抽牌", () => {
    const card = byId("monster_medium:p031");
    const attack = readMonsterAttackView(card, 1);
    if (attack.status !== "ready") throw new Error(attack.reason);
    const range = readPrintedRange(attack.view);
    if (range.kind !== "exact") throw new Error("缺少射程");
    const context = { ...combat, areaDistance: range.distance };
    expect(resolveMonsterSkill(card, 1, context, 1)).toMatchObject({
      status: "resolved",
      resolution: { targetDisease: true, skipped: [] },
    });
    const miss = resolveMonsterSkill(card, 1, context, 10);
    expect(miss).toMatchObject({ status: "resolved", resolution: { outcome: "miss" } });
    if (miss.status === "resolved") expect(miss.resolution.targetDisease).toBeUndefined();
  });
  it("Spitter 对 Mark 的加伤先参与 Protection；落空不施加状态", () => {
    const card = byId("monster_medium:p037");
    const attack = readMonsterAttackView(card, 2);
    if (attack.status !== "ready") throw new Error(attack.reason);
    const range = readPrintedRange(attack.view);
    if (range.kind !== "exact") throw new Error("缺少射程");
    const plain = resolveMonsterSkill(
      card,
      2,
      { ...combat, areaDistance: range.distance, target: { ...combat.target, markStacks: 1 } },
      1,
    );
    const protectedResult = resolveMonsterSkill(
      card,
      2,
      {
        ...combat,
        areaDistance: range.distance,
        target: { ...combat.target, markStacks: 1, protection: true },
      },
      1,
    );
    expect(plain.status).toBe("resolved");
    expect(protectedResult.status).toBe("resolved");
    if (plain.status === "resolved" && protectedResult.status === "resolved")
      expect(protectedResult.resolution.damageDealt).toBe(
        Math.ceil(plain.resolution.damageDealt! / 2),
      );
    const miss = resolveMonsterSkill(
      card,
      2,
      { ...combat, areaDistance: range.distance, target: { ...combat.target, dodge: 20 } },
      10,
    );
    expect(miss.status).toBe("resolved");
    if (miss.status === "resolved")
      expect(miss.resolution).toMatchObject({ outcome: "miss", targetStatusEffects: [] });
  });
});
