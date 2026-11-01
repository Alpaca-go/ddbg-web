import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readMonsterAttackView, resolveMonsterSkill, type MonsterCardView } from "./monster-skill";
const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;
const card = cards.find((c) => c.id === "monster_medium:p066")!;
const combat = {
  actor: { id: "witch", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, stress: 0, dodge: 0 },
  areaDistance: 2,
  light: 5,
};
it("R-140 Fate’s Pull 命中 Pull2 与压力1；落空无位移或压力", () => {
  const before = structuredClone(card);
  expect(resolveMonsterSkill(card, 3, combat, 5)).toMatchObject({
    status: "resolved",
    resolution: {
      outcome: "hit",
      targetShuffle: { direction: "pull", distance: 2 },
      targetStress: 1,
      skipped: [],
    },
  });
  expect(
    resolveMonsterSkill(card, 3, { ...combat, target: { ...combat.target, dodge: 30 } }, 10),
  ).toMatchObject({
    status: "resolved",
    resolution: { outcome: "miss", targetShuffle: null, targetStress: 0 },
  });
  expect(card).toEqual(before);
  const icon = card.skills[2]!.effect_lines.flat().find(
    (s) => s.type === "icon" && s.icon.iconId === "ed2299539e",
  );
  expect(icon?.type === "icon" && icon.icon.key).toBe("shuffle_resist");
});
it("不外推其它身份或槽位，错误原语数值拒绝", () => {
  const skill = card.skills[2]!;
  expect(readMonsterAttackView({ ...card, id: "monster_medium:p063" }, 3).status).toBe("refused");
  expect(readMonsterAttackView({ ...card, skills: [{ ...skill, slot: 1 }] }, 1).status).toBe(
    "refused",
  );
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
              effects: [
                { type: "shuffle", scope: "target", direction: "pull", distance: 3 },
                { type: "stress", scope: "target", amount: 1 },
              ],
            },
          },
        ],
      },
      3,
    ).status,
  ).toBe("refused");
});
