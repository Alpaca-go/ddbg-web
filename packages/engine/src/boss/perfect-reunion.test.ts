import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readMonsterAttackView, resolveMonsterSkill, type MonsterCardView } from "../monster-skill";
const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;
const card = cards.find((c) => c.id === "monster_medium:p106")!;
const combat = {
  actor: { id: "reflection", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, stress: 0, dodge: 0 },
  areaDistance: 1,
  light: 5,
};
it("Reunion 两行完整结算：Marked 加伤 3，bleed 2/3t，stress +1", () => {
  const plain = resolveMonsterSkill(card, 1, combat, 5);
  const marked = resolveMonsterSkill(
    card,
    1,
    { ...combat, target: { ...combat.target, markStacks: 1 } },
    5,
  );
  expect(plain).toMatchObject({
    status: "resolved",
    resolution: {
      outcome: "hit",
      targetStress: 1,
      skipped: [],
      targetStatusEffects: [{ kind: "bleed", amount: 2, duration: 3 }],
    },
  });
  expect(marked.status).toBe("resolved");
  if (plain.status === "resolved" && marked.status === "resolved")
    expect(marked.resolution.damageDealt).toBe(plain.resolution.damageDealt! + 3);
});
it("跨行签名顺序、第二行未确认图标或原语数值漂移拒绝", () => {
  const skill = card.skills[0]!;
  const plan = skill.verified_monster_effects!;
  for (const changed of [
    { ...plan, signatures: [...plan.signatures].reverse() },
    { ...plan, effects: plan.effects.slice(0, -1) },
  ])
    expect(
      readMonsterAttackView(
        { ...card, skills: [{ ...skill, verified_monster_effects: changed }] },
        1,
      ).status,
    ).toBe("refused");
  const copy = structuredClone(card);
  const line = copy.skills[0]!.effect_lines[1]!;
  const icon = line.find((s) => s.type === "icon")!;
  if (icon.type === "icon") Object.assign(icon.icon, { naming: "unreviewed" });
  expect(readMonsterAttackView(copy, 1).status).toBe("refused");
});
it("落空无流血或效果压力，原始卡面不变", () => {
  const before = structuredClone(card);
  expect(
    resolveMonsterSkill(card, 1, { ...combat, target: { ...combat.target, dodge: 30 } }, 10),
  ).toMatchObject({
    status: "resolved",
    resolution: { outcome: "miss", targetStress: 0, targetStatusEffects: [] },
  });
  expect(card).toEqual(before);
});
