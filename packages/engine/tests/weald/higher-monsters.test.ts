import { describe, expect, it } from "vitest";
import coreFile from "../../../data/normalized/corebox/monster_pool.json";
import {
  monsterPoolFileSchema,
  ruinsMonsterPool,
} from "../../../data/src/core/monsters/monster-pool";
import { buildWealdHigherMonsterCatalog } from "../../src/weald/higher-monster-catalog";
import { buildWealdHigherMonsterPool } from "../../src/weald/higher-monster-pool";
import { resolveMonsterSkill, readMonsterAttackView } from "../../src/shared/core/monster-skill";
import { selectMonsterSkill } from "../../src/shared/core/monster-stance";
import { readPrintedTargets } from "../../src/core/heroes/hero-skill";

const core = monsterPoolFileSchema.parse(coreFile).cards;
const giant = () =>
  buildWealdHigherMonsterCatalog(2).find((c) => c.id === "monster_large:weald:p003")!;
const virago = () => buildWealdHigherMonsterCatalog(3)[0]!;
const combat = {
  actor: { id: "monster", wounds: 0 },
  target: { id: "hero", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
  areaDistance: 2,
};

describe("R-263 高等级 Weald 独立目录与组池", () => {
  it("采用核准更正并逐姿态逐点选招", () => {
    expect(virago()).toMatchObject({
      life: 39,
      dodge: 4,
      speed: 3,
      immunities: [{ key: "stun_resist" }],
    });
    expect(giant()).toMatchObject({
      life: 60,
      dodge: 1,
      speed: 1,
      resistances: [{ key: "stun_resist" }, { key: "blight_resist" }, { key: "shuffle_resist" }],
    });
    for (const occupied of [
      ["aggressive", "defensive"],
      ["defensive", "ranged"],
      ["ranged", "support"],
    ] as const)
      for (let roll = 1; roll <= 10; roll++)
        expect(selectMonsterSkill(giant(), occupied, roll)).toMatchObject({
          status: "selected",
          skillSlot: roll <= 2 ? 1 : roll <= 6 ? 2 : 3,
        });
    for (const stance of ["aggressive", "defensive", "ranged", "support"] as const)
      for (let roll = 1; roll <= 10; roll++)
        expect(selectMonsterSkill(virago(), [stance], roll)).toMatchObject({
          status: "selected",
          skillSlot: roll <= 5 ? 1 : 2,
        });
  });
  it.each([2, 3] as const)("%i 级当地实体守恒，仅混同级通用", (level) => {
    const pool = buildWealdHigherMonsterPool({ contentPacks: ["core", "weald"], core, level });
    const ids = new Set(
      core.filter((c) => c.location === "common" && c.level === level).map((c) => c.combatCardId),
    );
    expect(pool.filter((c) => !c.instanceId.includes(":weald:"))).toEqual(
      ruinsMonsterPool(core, level).filter((c) => ids.has(c.cardId)),
    );
    expect(
      pool
        .filter((c) => c.instanceId.includes(":weald:"))
        .map((c) => [c.instanceId, c.stanceSlots]),
    ).toEqual(
      (level === 2 ? [15, 16, 17] : [18, 19]).map((p) => [
        `monster-deck:weald:p0${p}`,
        p === 17 ? 2 : 1,
      ]),
    );
    expect(new Set(pool.map((c) => c.instanceId)).size).toBe(pool.length);
    expect(() => buildWealdHigherMonsterPool({ contentPacks: ["core"], core, level })).toThrow();
  });
  it("五技能通过真实解析器，目标数和命中伤害正确", () => {
    for (const card of [giant(), virago()])
      for (const skill of card.skills) {
        const attack = readMonsterAttackView(card, skill.slot);
        if (attack.status !== "ready") throw new Error(attack.reason);
        expect(readPrintedTargets(attack.view)).toEqual({
          kind: "exact",
          max:
            card.id.includes("large") && skill.slot === 2
              ? 4
              : card.id.includes("medium") && skill.slot === 1
                ? 2
                : 1,
        });
      }
    const probe = resolveMonsterSkill(giant(), 2, combat, 1);
    if (probe.status === "refused") throw new Error(probe.reason);
    for (const [roll, damage] of [
      [1, 4],
      [8, 2],
      [10, null],
    ] as const)
      expect(resolveMonsterSkill(giant(), 2, combat, roll)).toMatchObject({
        status: "resolved",
        resolution: { damageDealt: damage },
      });
    expect(resolveMonsterSkill(virago(), 1, { ...combat, areaDistance: 1 }, 9)).toMatchObject({
      status: "resolved",
      resolution: { damageDealt: 6 },
    });
  });
  it("腐蚀、减益和 Mark 保留核准面值与持续时间，Push 为目标效果", () => {
    const cases = [
      [giant(), 2, [{ kind: "debuff", duration: 2 }]],
      [giant(), 3, [{ kind: "blight", amount: 2, duration: 3 }]],
      [
        virago(),
        1,
        [
          { kind: "mark", duration: 2 },
          { kind: "debuff", duration: 2 },
        ],
      ],
      [virago(), 2, [{ kind: "blight", amount: 3, duration: 3 }]],
    ] as const;
    for (const [card, slot, effects] of cases) {
      const attack = readMonsterAttackView(card, slot);
      if (attack.status !== "ready") throw new Error(attack.reason);
      expect(attack.view.rules?.statuses).toEqual(
        effects.map((effect) => expect.objectContaining(effect)),
      );
    }
    for (const [card, slot] of [
      [giant(), 1],
      [virago(), 2],
    ] as const) {
      const skill = card.skills.find((skill) => skill.slot === slot)!;
      expect(skill.rules?.effects?.effects).toContainEqual({
        type: "shuffle",
        scope: "target",
        direction: "push",
        distance: 1,
      });
    }
    const first = buildWealdHigherMonsterCatalog(2);
    expect(buildWealdHigherMonsterCatalog(2)).toEqual(first);
    expect(() => buildWealdHigherMonsterCatalog(1 as 2)).toThrow();
  });
});
