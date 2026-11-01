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
  target: { id: "hero", side: "hero" as const, wounds: 0, stress: 0, dodge: 0 },
  areaDistance: 1,
  light: 5,
};

it("It Chooses 命中施加标记 2t 与眩晕 1t，输入不变且可重现", () => {
  const before = structuredClone(card);
  const result = resolveMonsterSkill(card, 1, combat, 5);
  expect(result).toMatchObject({
    status: "resolved",
    resolution: {
      outcome: "hit",
      skipped: [],
      targetStatusEffects: [
        { kind: "mark", duration: 2 },
        { kind: "stun", duration: 1 },
      ],
    },
  });
  expect(resolveMonsterSkill(card, 1, combat, 5)).toEqual(result);
  expect(card).toEqual(before);
});

it("落空无状态，超出印刷射程拒绝", () => {
  expect(
    resolveMonsterSkill(card, 1, { ...combat, target: { ...combat.target, dodge: 30 } }, 10),
  ).toMatchObject({ status: "resolved", resolution: { outcome: "miss", targetStatusEffects: [] } });
  expect(resolveMonsterSkill(card, 1, { ...combat, areaDistance: 2 }, 5).status).toBe("refused");
});

it("计划持续时间漂移拒绝", () => {
  const skill = card.skills.find((s) => s.slot === 1)!;
  const plan = skill.verified_monster_effects!;
  expect(
    readMonsterAttackView(
      {
        ...card,
        skills: [
          {
            ...skill,
            verified_monster_effects: {
              ...plan,
              effects: plan.effects.map((e) => (e.type === "status" ? { ...e, duration: 9 } : e)),
            },
          },
        ],
      },
      1,
    ).status,
  ).toBe("refused");
});
