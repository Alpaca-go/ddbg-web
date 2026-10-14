import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createRng,
  resolveHeroSkill,
  resolveHeroSkillEffects,
  resolveMonsterSkill,
  resolveMonsterSkillEffects,
  resolveSkillHeroHealth,
  rollD10,
} from "./index";
import type {
  HeroSkillCardView,
  MonsterCardView,
  SkillCombatState,
  SkillEffectsResolution,
} from "./index";

function cards<T>(file: string): T[] {
  return (
    JSON.parse(
      readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
    ) as { cards: T[] }
  ).cards;
}
const skills = cards<HeroSkillCardView>("hero_skill");
const monsters = cards<MonsterCardView>("monster_medium");
function card(id: string) {
  const found = skills.find((entry) => entry.id === `hero_skill:${id}`);
  if (!found) throw new Error(`缺少 ${id}`);
  return found;
}
const attack: SkillCombatState = {
  actor: { id: "crusader", wounds: 17, stress: 3 },
  target: {
    id: "soldier",
    side: "monster",
    monsterTypeTags: ["Beast"],
    wounds: 0,
    dodge: 0,
    life: 7,
    riposte: true,
  },
};
const door = { id: "crusader", life: 17, wounds: 17, dead: false };

describe("技能的有序生命效果接纯死门结算（R20、R21、R29）", () => {
  it("多次反击先入死门、再掷骰；死亡后不继续掷骰或复活", () => {
    const resolved = resolveHeroSkillEffects(card("p001"), attack, 8);
    const effect = resolved.healthEffects.find((e) => e.source === "riposte")!;
    const batch = { ...resolved, healthEffects: [effect, effect, effect] };
    const dying = { ...door, wounds: 16 };
    let seed = 0;
    while (Math.floor(createRng(seed).next() * 10) >= 3) seed += 1;
    const result = resolveSkillHeroHealth(batch, [dying], seed, 0);
    expect(result).toMatchObject({
      status: "resolved",
      rngCursor: 1,
      heroes: [{ wounds: 17, dead: true }],
      steps: [{ resolution: { enteredDeathDoor: true } }, { resolution: { deathblow: true } }],
    });
    if (result.status === "resolved") expect(result.steps).toHaveLength(2);
    expect(resolveSkillHeroHealth(batch, [{ ...door, dead: true }], seed, 0)).toMatchObject({
      status: "refused",
      rngCursor: 0,
    });
  });
  it("真实 Smite 防护后伤害与反击分别输出；旧 API 结果不变", () => {
    const combat = { ...attack, target: { ...attack.target, protection: true } };
    const result = resolveHeroSkillEffects(card("p001"), combat, 8);
    expect(result.resolution).toEqual(resolveHeroSkill(card("p001"), combat, 8));
    expect(result.healthEffects).toEqual([
      {
        entityId: "soldier",
        side: "monster",
        source: "attack",
        effect: { type: "wounds", amounts: [4] },
      },
      {
        entityId: "crusader",
        side: "hero",
        source: "riposte",
        effect: { type: "wounds", amounts: [4] },
      },
    ]);
    const rng = createRng(7);
    rollD10(rng); // 技能骰已消费一次，生命结算只接后续游标。
    const expectedFace = rollD10(rng) <= 3 ? "skull" : "blank";
    expect(resolveSkillHeroHealth(result, [door], 7, 1)).toMatchObject({
      status: "resolved",
      rngCursor: 2,
      heroes: [{ ...door, dead: expectedFace === "skull" }],
      steps: [{ resolution: { face: expectedFace, deathblow: expectedFace === "skull" } }],
    });
  });

  it("落空没有伤害 / 反击，拒绝没有生命效果且游标不动", () => {
    const miss = resolveHeroSkillEffects(card("p001"), attack, 10);
    expect(miss.healthEffects).toEqual([]);
    expect(resolveSkillHeroHealth(miss, [door], 7, 1)).toMatchObject({
      status: "resolved",
      heroes: [door],
      rngCursor: 1,
      steps: [],
    });
    const refused = resolveHeroSkillEffects(
      { ...card("p001"), verification: { unverified: true } },
      attack,
      1,
    );
    expect(refused.healthEffects).toEqual([]);
    expect(resolveSkillHeroHealth(refused, [door], 7, 1)).toMatchObject({
      status: "refused",
      rngCursor: 1,
    });
  });

  it("真实 Divine Comfort 先自疗后治疗目标；落空仍只有自疗", () => {
    const combat: SkillCombatState = {
      actor: { id: "vestal", wounds: 12, stress: 3 },
      target: { id: "crusader", side: "hero", wounds: 17, dodge: 0, stress: 3 },
    };
    const result = resolveHeroSkillEffects(card("p097"), combat, 2);
    expect(result.healthEffects).toEqual([
      { entityId: "vestal", side: "hero", source: "selfHeal", effect: { type: "heal", amount: 2 } },
      {
        entityId: "crusader",
        side: "hero",
        source: "targetHeal",
        effect: { type: "heal", amount: 3 },
      },
    ]);
    expect(
      resolveSkillHeroHealth(
        result,
        [{ id: "vestal", life: 12, wounds: 12, dead: false }, door],
        7,
        3,
      ),
    ).toMatchObject({
      status: "resolved",
      rngCursor: 3,
      heroes: [
        { id: "vestal", wounds: 10 },
        { id: "crusader", wounds: 14 },
      ],
      steps: [{ resolution: { leftDeathDoor: true } }, { resolution: { leftDeathDoor: true } }],
    });
    const miss = resolveHeroSkillEffects(
      card("p097"),
      { ...combat, target: { ...combat.target, dodge: 20 } },
      10,
    );
    expect(miss.resolution.outcome).toBe("miss");
    expect(miss.healthEffects).toEqual([result.healthEffects[0]]);
  });

  it("自身目标只治疗一次；Battle Heal 超额治疗仍到零", () => {
    const self: SkillCombatState = {
      actor: { id: "abomination", wounds: 7, stress: 3 },
      target: { id: "abomination", side: "hero", wounds: 7, dodge: 0, stress: 3 },
    };
    const result = resolveHeroSkillEffects(card("p218"), self, 10);
    expect(result.healthEffects).toHaveLength(1);
    expect(
      resolveSkillHeroHealth(
        result,
        [{ id: "abomination", life: 7, wounds: 7, dead: false }],
        7,
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      rngCursor: 1,
      heroes: [{ wounds: 4 }],
      steps: [{ resolution: { leftDeathDoor: true } }],
    });
    const heal = resolveHeroSkillEffects(
      card("p014"),
      { target: { id: "crusader", side: "hero", wounds: 1, dodge: 0 } },
      2,
    );
    expect(resolveSkillHeroHealth(heal, [{ ...door, wounds: 1 }], 7, 1)).toMatchObject({
      status: "resolved",
      heroes: [{ wounds: 0 }],
      rngCursor: 1,
    });
  });

  it("真实 Bone Soldier 攻击接生命封顶；下一击才掷死门骰，怪物不掷英雄骰", () => {
    const monster = monsters.find((entry) => entry.id === "monster_medium:p001")!;
    const combat = {
      actor: { id: "soldier", wounds: 0 },
      target: {
        id: "crusader",
        side: "hero" as const,
        wounds: 14,
        dodge: 1,
        stress: 3,
        riposte: true,
      },
      areaDistance: 1,
    };
    const result = resolveMonsterSkillEffects(monster, 1, combat, 8);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") throw new Error(result.reason);
    const { healthEffects, own: _own, ...legacy } = result;
    void _own;
    expect(legacy).toEqual(resolveMonsterSkill(monster, 1, combat, 8));
    const effects = { resolution: result.resolution, healthEffects };
    expect(resolveSkillHeroHealth(effects, [{ ...door, wounds: 14 }], 7, 1)).toMatchObject({
      status: "resolved",
      rngCursor: 1,
      heroes: [door],
      steps: [{ resolution: { enteredDeathDoor: true, face: null } }],
    });
    expect(resolveSkillHeroHealth(effects, [door], 7, 1)).toMatchObject({
      status: "resolved",
      rngCursor: 2,
    });
  });

  it("不能把自疗后受伤合成净差值；依次离开 / 再进入死门不掷骰", () => {
    // 规则场景，非新增卡数据：同一角色先治疗 2，再受伤 2，最终伤口不变。
    const result: SkillEffectsResolution = {
      resolution: resolveHeroSkill(card("p001"), attack, 8),
      healthEffects: [
        {
          entityId: "crusader",
          side: "hero",
          source: "selfHeal",
          effect: { type: "heal", amount: 2 },
        },
        {
          entityId: "crusader",
          side: "hero",
          source: "riposte",
          effect: { type: "wounds", amounts: [2] },
        },
      ],
    };
    expect(resolveSkillHeroHealth(result, [door], 7, 1)).toMatchObject({
      status: "resolved",
      heroes: [door],
      rngCursor: 1,
      steps: [
        { resolution: { leftDeathDoor: true } },
        { resolution: { enteredDeathDoor: true, face: null } },
      ],
    });
  });

  it("缺 Life / 接收者、重复身份、亡者、晚到的非法效果均原子拒绝，不消费 RNG", () => {
    const result = resolveHeroSkillEffects(card("p001"), attack, 8);
    for (const heroes of [[], [door, door], [{ ...door, life: 0 }], [{ ...door, dead: true }]])
      expect(resolveSkillHeroHealth(result, heroes, 7, 1)).toMatchObject({
        status: "refused",
        rngCursor: 1,
      });
    const invalid: SkillEffectsResolution = {
      ...result,
      healthEffects: [
        ...result.healthEffects,
        {
          entityId: "crusader",
          side: "hero",
          source: "riposte",
          effect: { type: "wounds", amounts: [NaN] },
        },
      ],
    };
    expect(resolveSkillHeroHealth(invalid, [door], 7, 1)).toMatchObject({
      status: "refused",
      rngCursor: 1,
    });
    expect(resolveSkillHeroHealth(result, [door], NaN, 1)).toMatchObject({
      status: "refused",
      rngCursor: 1,
    });
  });

  it("同种子回放一致且不改技能 / 生命输入；零伤害无死门骰", () => {
    const result = resolveHeroSkillEffects(card("p001"), attack, 8);
    const before = structuredClone({ result, door, attack });
    expect(resolveSkillHeroHealth(result, [door], 7, 4)).toEqual(
      resolveSkillHeroHealth(result, [door], 7, 4),
    );
    const zero = {
      ...result,
      healthEffects: [
        {
          entityId: "crusader",
          side: "hero" as const,
          source: "attack" as const,
          effect: { type: "wounds" as const, amounts: [0] },
        },
      ],
    };
    expect(resolveSkillHeroHealth(zero, [door], 7, 4)).toMatchObject({
      status: "resolved",
      rngCursor: 4,
      heroes: [door],
    });
    expect({ result, door, attack }).toEqual(before);
  });
});
