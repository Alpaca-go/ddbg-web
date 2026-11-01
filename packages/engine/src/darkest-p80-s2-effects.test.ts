import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readMonsterAttackView } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;
it("Polyp Violent Hack 完整印刷计划，拒绝效果漂移", () => {
  const card = cards.find((c) => c.id === "monster_medium:p080")!;
  const skill = card.skills.find((s) => s.slot === 2)!;
  expect(skill.verified_monster_effects?.effects).toEqual([
    { type: "shuffle", scope: "self", direction: "push", distance: 2 },
  ]);
  expect(readMonsterAttackView(card, 2).status).toBe("ready");
  const plan = skill.verified_monster_effects!;
  expect(
    readMonsterAttackView(
      { ...card, skills: [{ ...skill, verified_monster_effects: { ...plan, effects: [] } }] },
      2,
    ).status,
  ).toBe("refused");
});
