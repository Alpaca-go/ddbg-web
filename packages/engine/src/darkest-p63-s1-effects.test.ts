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
it("Ascended Brawler Rend for the New God 完整印刷计划，拒绝效果漂移", () => {
  const card = cards.find((c) => c.id === "monster_medium:p063")!;
  const skill = card.skills.find((s) => s.slot === 1)!;
  expect(skill.verified_monster_effects?.effects).toEqual([
    { type: "shuffle", scope: "self", direction: "pull", distance: 1 },
    { type: "status", scope: "target", kind: "bleed", duration: 3, amount: 2 },
    { type: "status", scope: "target", kind: "debuff", duration: 1 },
    { type: "damageBonus", condition: "marked", amount: 3 },
  ]);
  expect(readMonsterAttackView(card, 1).status).toBe("ready");
  const plan = skill.verified_monster_effects!;
  expect(
    readMonsterAttackView(
      { ...card, skills: [{ ...skill, verified_monster_effects: { ...plan, effects: [] } }] },
      1,
    ).status,
  ).toBe("refused");
});
