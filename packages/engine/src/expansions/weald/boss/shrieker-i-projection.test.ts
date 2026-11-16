import { expect, it } from "vitest";
import { buildShriekerICombatCatalog } from "./shrieker-i-projection";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";
import { readMonsterAttackView, resolveMonsterSkill } from "../../../monster-skill";
import { selectMonsterSkill } from "../../../monster-stance";
import { readPrintedRange, readPrintedTargets } from "../../../hero-skill";

it("R-261 核准属性／抗性与全姿态十面选招，Nest 不伪造主动技能", () => {
  const before = structuredClone(content);
  const [shrieker, nest] = buildShriekerICombatCatalog({ nestInPlay: true });
  expect(shrieker).toMatchObject({
    life: 49,
    speed: 3,
    dodge: 2,
    type_position_tags: ["Eldritch", "Beast", "Large"],
  });
  expect(shrieker!.resistances!.map((e) => e.key)).toEqual([
    "stun_resist",
    "bleed_resist",
    "shuffle_resist",
  ]);
  expect(shrieker!.immunities!.map((e) => e.key)).toEqual(["blight_resist"]);
  expect(nest).toMatchObject({
    life: 20,
    speed: 0,
    dodge: 0,
    skills: [],
    stanceGroups: [],
    resistances: [],
  });
  expect(nest!.immunities).toHaveLength(5);
  for (const occupied of [
    ["aggressive", "defensive"],
    ["defensive", "ranged"],
    ["ranged", "support"],
  ] as const) {
    expect(selectMonsterSkill(shrieker!, occupied)).toMatchObject({ status: "needsRoll" });
    for (let roll = 1; roll <= 10; roll++)
      expect(selectMonsterSkill(shrieker!, occupied, roll)).toMatchObject({
        skillSlot: roll <= 5 ? 1 : roll <= 9 ? 2 : 3,
      });
  }
  expect(selectMonsterSkill(nest!, ["ranged", "support"], 1).status).toBe("refused");
  expect(content).toEqual(before);
});

const combat = {
  actor: { id: "shrieker", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
  areaDistance: 1,
};

it.each([
  [1, 1, 1, 8, 11, 2],
  [2, 1, 4, 2, 4, 1],
  [3, 2, 2, 1, 2, 1],
])(
  "R-261 技能 %i 的范围／目标数及普通／暴击／未命中由共用结算器读取",
  (slot, range, targets, damage, critDamage, crit) => {
    const [shrieker] = buildShriekerICombatCatalog({ nestInPlay: false });
    const attack = readMonsterAttackView(shrieker!, slot);
    expect(attack.status).toBe("ready");
    if (attack.status !== "ready") throw new Error(attack.reason);
    expect(readPrintedRange(attack.view)).toMatchObject({ kind: "exact", distance: range });
    expect(readPrintedTargets(attack.view)).toMatchObject({ kind: "exact", max: targets });
    for (const [roll, outcome, amount] of [
      [5, "hit", damage],
      [crit, "crit", critDamage],
    ] as const) {
      const result = resolveMonsterSkill(shrieker!, slot, { ...combat, areaDistance: range }, roll);
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") throw new Error(result.reason);
      expect(result.resolution).toMatchObject({ outcome, damageDealt: amount });
      if (slot === 1)
        expect(result.resolution).toMatchObject({
          actorShuffle: { direction: "pull", distance: 1 },
          targetStatusEffects: [expect.objectContaining({ kind: "bleed", amount: 2, duration: 2 })],
        });
      if (slot === 2)
        expect(result.resolution).toMatchObject({
          actorShuffle: { direction: "push", distance: 2 },
          targetStress: outcome === "crit" ? 2 : 1,
        });
      if (slot === 3)
        expect(result.resolution).toMatchObject({
          targetDisease: true,
          targetStatusEffects: [expect.objectContaining({ kind: "debuff", duration: 2 })],
        });
    }
    const miss = resolveMonsterSkill(
      shrieker!,
      slot,
      { ...combat, areaDistance: range, target: { ...combat.target, dodge: 10 } },
      10,
    );
    expect(miss.status).toBe("resolved");
    if (miss.status !== "resolved") throw new Error(miss.reason);
    expect(miss.resolution).toMatchObject({ outcome: "miss", damageDealt: null });
  },
);

it("R-261 Peck／Regurgitate 的效果计划不丢流血、减益或疾病；Nest 替代能力显式拒绝", () => {
  const [base] = buildShriekerICombatCatalog({ nestInPlay: false });
  expect(base!.skills[0]!.verified_monster_effects!.effects).toEqual([
    { type: "shuffle", scope: "self", direction: "pull", distance: 1 },
    { type: "status", scope: "target", kind: "bleed", amount: 2, duration: 2 },
  ]);
  expect(base!.skills[2]!.verified_monster_effects!.effects).toEqual([
    { type: "status", scope: "target", kind: "debuff", duration: 2 },
    { type: "disease", scope: "target" },
  ]);
  const [withNest] = buildShriekerICombatCatalog({ nestInPlay: true });
  expect(readMonsterAttackView(withNest!, 1).status).toBe("ready");
  expect(readMonsterAttackView(withNest!, 3).status).toBe("ready");
  expect(readMonsterAttackView(withNest!, 2)).toMatchObject({
    status: "refused",
    reason: expect.stringContaining("Q-186"),
  });
  expect(resolveMonsterSkill(withNest!, 2, combat, 5).status).toBe("refused");
});
