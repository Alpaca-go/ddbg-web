import { expect, it } from "vitest";
import { buildRuinsActTransitionPlan } from "./act-transition-plan";
import { RUINS_BOSS_IDENTITIES } from "./boss/threat-description-catalog";

it("I→II从剩余三Boss的II级描述卡抽选，任务整级替换，只加入II级怪物", () => {
  const defeated = ["necromancer"] as const;
  const removed = ["quest:p001", "quest:p003"];
  const before = structuredClone(removed);
  const plan = buildRuinsActTransitionPlan(1, defeated, removed);
  expect(plan.imminentThreatDescriptionCardIds).toEqual([
    "boss_ability:p008",
    "boss_ability:p014",
    "boss_ability:p020",
  ]);
  expect(plan.retiredQuestIds).toEqual([1, 2, 3, 4, 5].map((n) => `quest:p00${n}`));
  expect(plan.nextOrdinaryQuestIds).toEqual(
    [6, 7, 8, 9, 10].map((n) => `quest:p${String(n).padStart(3, "0")}`),
  );
  expect(plan.addedMonsterInstances).toHaveLength(11);
  expect(new Set(plan.addedMonsterInstances.map((m) => m.instanceId)).size).toBe(11);
  expect(
    plan.addedMonsterInstances.every((m) =>
      /^monster-deck:p(01[2-5]|05[0-5]|049)$/.test(m.instanceId),
    ),
  ).toBe(true);
  expect(plan.eligibleDungeonTrinketCardIds).toHaveLength(12);
  expect(plan.nomadOnlyTrinketLevels).toEqual([1]);
  expect(removed).toEqual(before);
  expect(plan.retainExistingMonsterInstances && plan.retainHeldTrinkets).toBe(true);
});

it("II→III保留旧级实例，加入III级9张；十张旧任务移出、I/II饰品只留游商", () => {
  const plan = buildRuinsActTransitionPlan(2, ["collector", "fanatic"], ["quest:p006"]);
  expect(plan.imminentThreatDescriptionCardIds).toEqual(["boss_ability:p003", "boss_ability:p009"]);
  expect(plan.retiredQuestIds).toHaveLength(10);
  expect(plan.nextOrdinaryQuestIds).toEqual(
    [11, 12, 13, 14, 15].map((n) => `quest:p${n.toString().padStart(3, "0")}`),
  );
  expect(plan.addedMonsterInstances).toHaveLength(9);
  expect(plan.eligibleDungeonTrinketCardIds).toHaveLength(12);
  expect(plan.nomadOnlyTrinketLevels).toEqual([1, 2]);
  plan.imminentThreatDescriptionCardIds.length = 0;
  expect(
    buildRuinsActTransitionPlan(2, ["collector", "fanatic"], []).imminentThreatDescriptionCardIds,
  ).toHaveLength(2);
});

it("四Boss单败和两两组合均排除已败Boss，不消费随机数或改变输入", () => {
  for (const boss of RUINS_BOSS_IDENTITIES) {
    const first = buildRuinsActTransitionPlan(1, [boss], []);
    expect(first).toEqual(buildRuinsActTransitionPlan(1, [boss], []));
    expect(first.imminentThreatDescriptionCardIds).toHaveLength(3);
    for (const other of RUINS_BOSS_IDENTITIES.filter((id) => id !== boss))
      expect(
        buildRuinsActTransitionPlan(2, [boss, other], []).imminentThreatDescriptionCardIds,
      ).toHaveLength(2);
  }
});

it("拒绝错误等级/击败数、重复Boss及无效或未来任务移出记录", () => {
  expect(() => buildRuinsActTransitionPlan(1, [], [])).toThrow();
  expect(() => buildRuinsActTransitionPlan(2, ["necromancer", "necromancer"], [])).toThrow();
  for (const removed of [["quest:p006"], ["quest:p019"], ["unknown"], ["quest:p001", "quest:p001"]])
    expect(() => buildRuinsActTransitionPlan(1, ["prophet"], removed)).toThrow();
});
