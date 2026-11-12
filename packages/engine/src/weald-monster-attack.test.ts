import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPrintedTargets } from "./hero-skill";
import { readMonsterAttackView, resolveMonsterSkill } from "./monster-skill";
import type { MonsterCombatState } from "./monster-skill";
import { buildWealdMonsterCatalog } from "./expansions/weald/monster-catalog";
import { selectMonsterSkill } from "./monster-stance";
import { selectMonsterTarget } from "./monster-target";
import type { MonsterTargetHero } from "./monster-target";

const read = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../data/normalized/extension/weald/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as unknown;
const cards = buildWealdMonsterCatalog(read("monster_medium"), read("monster_large"));
function card(id: string) {
  return structuredClone(cards.find((card) => card.id === id)!);
}
const E = "monster_medium:weald:p001";
const G = "monster_medium:weald:p006";
const S = "monster_medium:weald:p009";
const A = "monster_medium:weald:p012";
const L = "monster_large:weald:p001";
// 使用 R-230 / R-232 核准目录，不修改原始卡面数据的审阅标记。
function fixture(id: string) {
  return card(id);
}
const combat = (range: number): MonsterCombatState => ({
  actor: { id: "monster", wounds: 0 },
  target: { id: "hero", side: "hero", wounds: 0, dodge: 0, stress: 0 },
  areaDistance: range,
});

describe("Weald R-230 已确认技能的独立结算", () => {
  it.each([
    [5, 1],
    [6, 2],
    [8, 2],
    [9, 3],
    [10, 3],
  ])("Ectoplasm d10 %i 选择技能 %i", (roll, skill) => {
    expect(selectMonsterSkill(fixture(E), ["aggressive"], roll)).toMatchObject({
      status: "selected",
      skillSlot: skill,
    });
  });

  it.each([
    [E, 1, 1, 7],
    [E, 1, 9, 4],
    [G, 1, 2, 4],
    [G, 1, 9, 2],
    [S, 1, 1, 7],
    [S, 1, 8, 4],
    [S, 2, 1, 6],
    [S, 2, 9, 4],
    [S, 3, 5, 3],
    [A, 1, 1, 2],
    [A, 1, 10, 1],
    [A, 2, 10, 1],
    [A, 3, 10, 1],
    [L, 1, 1, 9],
    [L, 1, 9, 6],
    [L, 2, 3, 6],
    [L, 2, 9, 3],
  ] as const)("%s 技能 %i / roll %i 的伤害是 %i", (id, slot, roll, damage) => {
    const monster = fixture(id);
    const range = monster.skills.find((skill) => skill.slot === slot)!.verified_weald_attack!.range;
    const result = resolveMonsterSkill(monster, slot, combat(range), roll);
    expect(result).toMatchObject({
      status: "resolved",
      resolution: { status: "resolved", damageDealt: damage },
    });
  });

  it("Acc 之外落空；Rend the Marked 对被标记英雄加伤 3", () => {
    expect(resolveMonsterSkill(fixture(E), 1, combat(1), 10)).toMatchObject({
      status: "resolved",
      resolution: { outcome: "miss", damageDealt: null },
    });
    const state = combat(1);
    expect(
      resolveMonsterSkill(
        fixture(S),
        2,
        { ...state, target: { ...state.target, markStacks: 1 } },
        9,
      ),
    ).toMatchObject({ status: "resolved", resolution: { damageDealt: 7 } });
  });

  it("Slime Smack 最多两目标；Mark Prey、Rabid Rush 和腐蚀技能完整编译", () => {
    const smack = readMonsterAttackView(card(L), 2);
    expect(smack.status).toBe("ready");
    if (smack.status === "ready") {
      expect(readPrintedTargets(smack.view)).toEqual({ kind: "exact", max: 2 });
      expect(smack.view.verified_status_effects).toContainEqual(
        expect.objectContaining({ kind: "stun", duration: 1 }),
      );
    }
    const rush = readMonsterAttackView(card(G), 1);
    expect(rush.status).toBe("ready");
    if (rush.status === "ready") expect(rush.view.verified_target_disease).toBe(true);
    const prey = readMonsterAttackView(card(A), 1);
    if (prey.status !== "ready") throw new Error(prey.reason);
    expect(
      prey.view.verified_status_effects?.map((effect) => [effect.kind, effect.duration]),
    ).toEqual([
      ["mark", 2],
      ["debuff", 2],
    ]);
    for (const [slot, amount, duration] of [
      [2, 2, 2],
      [3, 1, 3],
    ]) {
      const attack = readMonsterAttackView(card(A), slot!);
      if (attack.status !== "ready") throw new Error(attack.reason);
      expect(attack.view.verified_status_effects).toContainEqual(
        expect.objectContaining({ kind: "blight", amount, duration }),
      );
      if (slot === 2) expect(attack.view.verified_target_disease).toBe(true);
    }
  });

  it("Marked → Closest 先选被标记英雄，无标记时才选最近英雄", () => {
    const heroes: MonsterTargetHero[] = [
      {
        id: "near",
        stance: "aggressive",
        areaDistance: 1,
        wounds: 0,
        stress: 0,
        markStacks: 0,
        guard: false,
        dead: false,
      },
      {
        id: "marked",
        stance: "defensive",
        areaDistance: 3,
        wounds: 0,
        stress: 0,
        markStacks: 1,
        guard: false,
        dead: false,
      },
    ];
    const source = fixture(S);
    expect(selectMonsterTarget(source, 2, heroes)).toMatchObject({ targetId: "marked" });
    expect(
      selectMonsterTarget(
        source,
        2,
        heroes.map((hero) => ({ ...hero, markStacks: 0 })),
      ),
    ).toMatchObject({ targetId: "near" });
  });

  it("三项召唤技能投影就绪且保留 Profusion 压力原语", () => {
    for (const [id, slot, summonId] of [
      [E, 2, E],
      [E, 3, L],
      [L, 3, L],
    ] as const) {
      const attack = readMonsterAttackView(card(id), slot);
      expect(attack).toMatchObject({
        status: "ready",
        wealdSummon: { cardId: summonId, count: 1 },
      });
    }
    const profusion = readMonsterAttackView(card(E), 3);
    if (profusion.status !== "ready") throw new Error(profusion.reason);
    expect(profusion.view.verified_target_stress).toEqual(expect.objectContaining({ amount: 1 }));
    expect(resolveMonsterSkill(card(E), 2, combat(1), 9)).toMatchObject({
      status: "resolved",
      resolution: { damageDealt: 1 },
    });
  });

  it("拒绝篡改核准目标数、原始射程或效果行", () => {
    const source = card(L);
    const altered = {
      ...source,
      skills: source.skills.map((skill) =>
        skill.slot !== 2
          ? skill
          : {
              ...skill,
              verified_weald_attack: { ...skill.verified_weald_attack!, targets: 1 },
            },
      ),
    };
    expect(readMonsterAttackView(altered, 2).status).toBe("refused");
    const original = card(A);
    const drift = {
      ...original,
      skills: original.skills.map((skill) =>
        skill.slot !== 2 ? skill : { ...skill, effect_lines: [] },
      ),
    };
    expect(readMonsterAttackView(drift, 2).status).toBe("refused");
    const rangeSource = card(A);
    const wrongRange = {
      ...rangeSource,
      skills: rangeSource.skills.map((skill) =>
        skill.slot !== 2
          ? skill
          : {
              ...skill,
              unlabeled_numbers: skill.unlabeled_numbers.map((number) =>
                number.anchor.type !== "beside_icon"
                  ? number
                  : { ...number, text: "3", numeric: 3 },
              ),
            },
      ),
    };
    expect(readMonsterAttackView(wrongRange, 2).status).toBe("refused");
  });
});
