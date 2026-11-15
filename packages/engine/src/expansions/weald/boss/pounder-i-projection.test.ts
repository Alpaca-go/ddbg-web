import { expect, it } from "vitest";
import {
  buildPounderICombatCatalog,
  createPounderIEntity,
  pounderIInitialDeployment,
} from "./pounder-i-projection";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-content";
import { readMonsterAttackView, resolveMonsterSkill } from "../../../monster-skill";
import { readPrintedRange, readPrintedTargets } from "../../../hero-skill";
import { selectMonsterSkill } from "../../../monster-stance";
import { planPounderIFireInTheHole } from "./pounder-i-combat-plans";

it("R-258 两面属性、类型、抗性免疫保留；Pounder 不自行选招", () => {
  const before = structuredClone(content);
  const [pounder, matchman] = buildPounderICombatCatalog();
  expect(
    [pounder, matchman].map((c) => [c!.life, c!.speed, c!.dodge, c!.innateProtection]),
  ).toEqual([
    [55, 0, 0, true],
    [7, 1, 2, false],
  ]);
  expect(pounder!.type_position_tags).toEqual([]);
  expect(matchman!.type_position_tags).toEqual(["Human"]);
  expect(matchman!.resistances?.map((i) => i.key)).toEqual(["stun_resist", "shuffle_resist"]);
  expect(pounder!.immunities?.map((i) => i.key)).toEqual([
    "stun_resist",
    "bleed_resist",
    "blight_resist",
    "debuff_resist",
    "shuffle_resist",
  ]);
  for (const stance of ["aggressive", "defensive", "ranged", "support"] as const) {
    expect(selectMonsterSkill(pounder!, [stance]).status).toBe("refused");
    expect(selectMonsterSkill(matchman!, [stance])).toEqual({
      status: "selected",
      skillSlot: 1,
      roll: null,
    });
  }
  expect(matchman!.skills[0]!.printed_labels).toEqual([]);
  expect(content).toEqual(before);
});

it("W4 初始只放 B 区 Aggressive 的 Pounder；可按核准姿态创建 Matchman", () => {
  const deployment = pounderIInitialDeployment();
  expect(deployment.entities).toHaveLength(1);
  expect(deployment.entities[0]).toMatchObject({
    id: "boss:pounder",
    areaId: "B",
    stance: "aggressive",
    stanceSlots: 1,
    life: 55,
    protection: true,
    shuffleResist: true,
  });
  expect(deployment.monsters).toHaveLength(2);
  expect(deployment.areas).toHaveLength(12);
  for (const [stance, areaId] of Object.entries(content.tile.deployment.monsters)) {
    const entity = createPounderIEntity(
      "matchman",
      "summon:m",
      stance as "aggressive" | "defensive" | "ranged" | "support",
    );
    expect(entity).toMatchObject({
      areaId,
      stance,
      stanceSlots: 1,
      life: 7,
      protection: false,
      shuffleResist: false,
    });
  }
  deployment.entities[0] = { ...deployment.entities[0]!, wounds: 40 };
  deployment.monsterStanceAreas.aggressive = "A";
  expect(pounderIInitialDeployment().entities[0]).toMatchObject({ wounds: 0, areaId: "B" });
});

const combat = {
  actor: { id: "boss:pounder", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
  areaDistance: 5,
};

it("炮击共用解析器读取 Crowded、射程5、四目标与命中压力2", () => {
  const [pounder] = buildPounderICombatCatalog();
  const attack = readMonsterAttackView(pounder!, 1);
  expect(attack.status).toBe("ready");
  if (attack.status !== "ready") throw new Error(attack.reason);
  expect(readPrintedRange(attack.view)).toEqual({ kind: "exact", distance: 5 });
  expect(readPrintedTargets(attack.view)).toMatchObject({ kind: "exact", max: 4 });
  expect(pounder!.skills[0]!.target).toBe("Crowded");
  const hit = resolveMonsterSkill(pounder!, 1, combat, 5);
  expect(hit).toMatchObject({
    status: "resolved",
    resolution: { outcome: "hit", damageDealt: 9, targetStress: 2 },
  });
  expect(resolveMonsterSkill(pounder!, 1, combat, 10)).toMatchObject({
    status: "resolved",
    resolution: { outcome: "miss", damageDealt: null, targetStress: 0 },
  });
});

it("暴击使用19伤害；超射程拒绝，Matchman 不能当作零伤害普通攻击执行", () => {
  const [pounder, matchman] = buildPounderICombatCatalog();
  expect(
    resolveMonsterSkill(pounder!, 1, { ...combat, actor: { ...combat.actor, buffStacks: 1 } }, 1),
  ).toMatchObject({
    status: "resolved",
    resolution: { outcome: "crit", damageDealt: 19 },
  });
  expect(resolveMonsterSkill(pounder!, 1, { ...combat, areaDistance: 6 }, 5).status).toBe(
    "refused",
  );
  expect(resolveMonsterSkill(matchman!, 1, { ...combat, areaDistance: 0 }, 5).status).toBe(
    "refused",
  );
});

it("真实投影实体同区触发后由 Pounder 卡结算炮击，分区不触发", () => {
  const pounder = createPounderIEntity("pounder", "p", "aggressive");
  const matchman = createPounderIEntity("matchman", "m", "defensive");
  expect(planPounderIFireInTheHole([pounder, matchman], "m")).toEqual({
    kind: "none",
    reason: "differentArea",
  });
  const plan = planPounderIFireInTheHole([pounder, { ...matchman, areaId: pounder.areaId }], "m");
  if (plan.kind !== "triggerSkill") throw new Error("同区触发失败");
  const card = buildPounderICombatCatalog().find((c) => c.id === plan.cardId)!;
  expect(
    resolveMonsterSkill(card, plan.slot, { ...combat, actor: { id: plan.actorId, wounds: 0 } }, 5),
  ).toMatchObject({ status: "resolved", resolution: { damageDealt: 9, targetStress: 2 } });
});
