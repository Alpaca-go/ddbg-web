import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readMonsterAttackView } from "./monster-skill";
import { resolveMonsterSkill } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;
it("Unbearable Tremors 按 Acc 判定纯压力，不虚构 Crit 或伤害", () => {
  const card = cards.find((c) => c.id === "monster_medium:p086")!;
  const combat = {
    actor: { id: "growth", wounds: 0 },
    target: { id: "hero", side: "hero" as const, wounds: 0, stress: 0, dodge: 0 },
    areaDistance: 2,
    targetsInArea: 4,
    light: 5,
  };
  for (const roll of [1, 5])
    expect(resolveMonsterSkill(card, 3, combat, roll)).toMatchObject({
      status: "resolved",
      resolution: { outcome: "hit", targetStress: 2, damageDealt: null },
    });
  expect(
    resolveMonsterSkill(card, 3, { ...combat, target: { ...combat.target, dodge: 30 } }, 10),
  ).toMatchObject({ status: "resolved", resolution: { outcome: "miss", targetStress: 0 } });
});
it("Defensive Growth Unbearable Tremors 完整印刷计划，拒绝效果漂移", () => {
  const card = cards.find((c) => c.id === "monster_medium:p086")!;
  const skill = card.skills.find((s) => s.slot === 3)!;
  expect(skill.verified_monster_effects?.effects).toEqual([
    { type: "stress", scope: "target", amount: 2 },
  ]);
  expect(readMonsterAttackView(card, 3).status).toBe("ready");
  const plan = skill.verified_monster_effects!;
  expect(
    readMonsterAttackView(
      { ...card, skills: [{ ...skill, verified_monster_effects: { ...plan, effects: [] } }] },
      3,
    ).status,
  ).toBe("refused");
});
