import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readMonsterAttackView, resolveMonsterSkill, type MonsterCardView } from "../monster-skill";

const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;
const card = cards.find((c) => c.id === "monster_medium:p109")!;
const combat = {
  actor: { id: "reflection", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, stress: 3, dodge: 0 },
  areaDistance: 2,
  light: 5,
};

it("We Are the Same 命中压力 +1、落空压力不变，确定且不修改输入", () => {
  const before = structuredClone(card);
  const result = resolveMonsterSkill(card, 2, combat, 5);
  expect(result).toMatchObject({
    status: "resolved",
    resolution: {
      outcome: "hit",
      targetStress: 4,
      skipped: [],
    },
  });
  expect(resolveMonsterSkill(card, 2, combat, 5)).toEqual(result);
  expect(
    resolveMonsterSkill(
      card,
      2,
      {
        ...combat,
        target: { ...combat.target, dodge: 30 },
      },
      10,
    ),
  ).toMatchObject({ status: "resolved", resolution: { outcome: "miss", targetStress: 3 } });
  expect(card).toEqual(before);
});

it("印刷 Acc 12、Crit 0、射程 2，错误距离拒绝", () => {
  expect(card.skills.find((s) => s.slot === 2)?.printed_labels).toEqual([
    { label: "Crit", raw: "Crit 0", value: 0 },
    { label: "Acc", raw: "Acc 12", value: 12 },
  ]);
  expect(resolveMonsterSkill(card, 2, { ...combat, areaDistance: 3 }, 5).status).toBe("refused");
});

it("效果数值或签名漂移拒绝，Perfect Reflection 不外推", () => {
  const skill = card.skills.find((s) => s.slot === 2)!;
  const plan = skill.verified_monster_effects!;
  for (const changed of [
    { ...plan, effects: [{ type: "stress" as const, scope: "target" as const, amount: 2 }] },
    { ...plan, signatures: ["{target_effects}{stress}+2"] },
  ])
    expect(
      readMonsterAttackView(
        { ...card, skills: [{ ...skill, verified_monster_effects: changed }] },
        2,
      ).status,
    ).toBe("refused");
});
