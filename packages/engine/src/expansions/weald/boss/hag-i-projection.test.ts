import { expect, it } from "vitest";
import { buildHagICombatCatalog, hagIInitialDeployment } from "./hag-i-projection";
import { readMonsterAttackView, resolveMonsterSkill } from "../../../monster-skill";
import { readPrintedRange, readPrintedTargets } from "../../../hero-skill";
import { selectMonsterSkill } from "../../../monster-stance";
import { WEALD_HAG_I_CONTENT } from "./hag-i-content";

it("R-254 运行卡面保留三面属性、核准选招及 Into the Pot 的空伤害", () => {
  const before = structuredClone(WEALD_HAG_I_CONTENT);
  const [hag, empty, full] = buildHagICombatCatalog();
  expect([hag, empty, full].map((c) => [c!.life, c!.speed, c!.dodge, c!.innateProtection])).toEqual(
    [
      [60, 2, 1, false],
      [66, 0, 0, true],
      [9, 0, 0, false],
    ],
  );
  for (const stance of ["aggressive", "defensive", "ranged", "support"] as const) {
    expect(selectMonsterSkill(hag!, [stance], 6)).toMatchObject({ skillSlot: 2 });
    expect(selectMonsterSkill(hag!, [stance], 7)).toMatchObject({ skillSlot: 3 });
    expect(selectMonsterSkill(full!, [stance], 10)).toMatchObject({ skillSlot: 1 });
  }
  expect(empty!.skills).toEqual([]);
  const pot = hag!.skills[0]!;
  expect(pot.printed_labels).toEqual([{ label: "Acc", value: 10 }]);
  expect(pot.unlabeled_numbers.some((n) => n.anchor.type === "printed_label")).toBe(false);
  expect(readMonsterAttackView(hag!, 1)).toMatchObject({ status: "ready", hagIntoPot: true });
  expect(WEALD_HAG_I_CONTENT).toEqual(before);
});

it("真实攻击经共用结算器读取范围、目标、伤害、压力和减益", () => {
  const [hag, , full] = buildHagICombatCatalog();
  const combat = {
    actor: { id: "hag", wounds: 0 },
    target: { id: "hero", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
    areaDistance: 1,
  };
  for (const [card, slot, range, targets, damage] of [
    [hag!, 2, 1, 3, 3],
    [hag!, 3, 2, 1, 1],
    [full!, 1, 0, 1, 5],
  ] as const) {
    const attack = readMonsterAttackView(card, slot);
    expect(attack.status).toBe("ready");
    if (attack.status !== "ready") throw new Error(attack.reason);
    expect(readPrintedRange(attack.view)).toMatchObject({ kind: "exact", distance: range });
    expect(readPrintedTargets(attack.view)).toMatchObject({ kind: "exact", max: targets });
    const result = resolveMonsterSkill(card, slot, { ...combat, areaDistance: range }, 5);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") throw new Error(result.reason);
    expect(result.resolution).toMatchObject({ outcome: "hit", damageDealt: damage });
    if (slot === 3 || card === full) expect(result.resolution.targetStress).toBe(1);
    if (slot === 3)
      expect(attack.view.verified_status_effects).toEqual([
        expect.objectContaining({ kind: "debuff", duration: 2 }),
      ]);
  }
});

it("10 号部署固定 B／F 与两格，满锅不额外增加实体或组件", () => {
  const plan = hagIInitialDeployment();
  expect(
    plan.entities.map((e) => [e.areaId, e.stance, e.stanceSlots, e.life, e.protection]),
  ).toEqual([
    ["B", "aggressive", 2, 60, false],
    ["F", "ranged", 2, 66, true],
  ]);
  expect(plan.entities.every((e) => e.shuffleResist)).toBe(true);
  expect(plan.monsters).toHaveLength(3);
  expect(plan.entities).toHaveLength(2);
  expect(plan.monsterStanceAreas).toEqual({
    aggressive: "B",
    defensive: "B",
    ranged: "F",
    support: "F",
  });
  plan.monsterStanceAreas.ranged = "A";
  expect(hagIInitialDeployment().monsterStanceAreas.ranged).toBe("F");
});
