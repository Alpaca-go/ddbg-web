import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveMonsterSkill } from "./index";
import type {
  BattleEntity,
  GameState,
  MonsterCardView,
  MonsterCombatState,
  SkillStance,
} from "./index";

const arbalist: MonsterCardView = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards.find((card: MonsterCardView) => card.id === "monster_medium:p007");
const crusader = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_stat.json", import.meta.url), "utf8"),
).cards.find(
  (card: { name: string; level: number }) => card.name === "CRUSADER" && card.level === 1,
);
const combat: MonsterCombatState = {
  actor: { id: "m", wounds: 0 },
  target: { id: "h", side: "hero", wounds: 2, dodge: 3, stress: 3 },
  areaDistance: 2,
  light: 5,
};
function withBonus(amount: number): MonsterCardView {
  return {
    ...arbalist,
    skills: arbalist.skills.map((skill) =>
      skill.slot === 1
        ? {
            ...skill,
            verified_damage_bonus: { ...skill.verified_damage_bonus!, amount },
          }
        : skill,
    ),
  };
}
function setup(card = arbalist): GameState {
  // 线性算法夹具只表达距离，不冒充真实房间部署。
  const stances: SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
  const heroes: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: "CRUSADER",
    skillIds: [],
    areaId: i === 2 ? "e" : "b",
    stance,
    wounds: 2,
    heroStatId: crusader.id,
    life: crusader.life,
    stress: 3,
    dodge: crusader.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(i === 2 ? { statusStacks: [{ kind: "mark" as const, remaining: 2 }] } : {}),
  }));
  const initial = createBattleState(1, {
    skills: [],
    heroStats: [crusader],
    monsters: [card],
    light: 5,
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        skillIds: [],
        areaId: "a",
        stance: "ranged",
        stanceSlots: 1,
        monsterCardId: card.id,
        life: card.life,
        wounds: 0,
        dodge: 1,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: ["a", "b", "c", "d", "e"].map((id, i, ids) => ({
      id,
      capacity: 8,
      elevation: "normal" as const,
      adjacent: [ids[i - 1], ids[i + 1]].filter((value): value is string => value !== undefined),
    })),
  });
  return {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}

describe("Arbalist I Quarrel 已核实对 Mark +1（R20–21、R-017、R-019、R-048）", () => {
  it("标记多堆只加一次；命中、暴击、防护、反击与落空共享既有结算", () => {
    for (const markStacks of [0, 1, 3])
      for (const roll of [1, 4, 10])
        for (const protection of [false, true]) {
          const result = resolveMonsterSkill(
            arbalist,
            1,
            {
              ...combat,
              target: { ...combat.target, markStacks, protection, riposte: true },
            },
            roll,
          );
          expect(result.status).toBe("resolved");
          if (result.status !== "resolved") throw new Error(result.reason);
          const base = roll === 1 ? 8 : 5;
          const damage = base + (markStacks ? 1 : 0);
          expect(result.resolution).toMatchObject({
            outcome: roll === 10 ? "miss" : roll === 1 ? "crit" : "hit",
            printedAmount: roll === 10 ? null : base,
            damageDealt: roll === 10 ? null : protection ? Math.ceil(damage / 2) : damage,
            riposteDamage: roll === 10 ? null : Math.ceil(damage / 2),
            skipped: [],
          });
        }
  });
  it("无注解仍跳过；注解伪造、行漂移整次拒绝", () => {
    const legacy = {
      ...arbalist,
      skills: arbalist.skills.map((skill) => {
        const { verified_damage_bonus, ...rest } = skill;
        if (skill.slot === 1) expect(verified_damage_bonus).toBeDefined();
        return rest;
      }),
    };
    const marked = { ...combat, target: { ...combat.target, markStacks: 1 } };
    expect(resolveMonsterSkill(legacy, 1, marked, 4)).toMatchObject({
      status: "resolved",
      resolution: { damageDealt: 5, skipped: [{ code: "effect_lines" }] },
    });
    for (const amount of [0, 2, NaN])
      expect(resolveMonsterSkill(withBonus(amount), 1, marked, 4).status).toBe("refused");
    const drift = { ...arbalist, skills: arbalist.skills.map((s) => ({ ...s, effect_lines: [] })) };
    expect(resolveMonsterSkill(drift, 1, marked, 4).status).toBe("refused");
  });
  it("公共命令按 Mark 选远处英雄、Speed 定位、掷一次攻击骰、只结束一次回合并确定性回放", () => {
    const initial = setup();
    const before = structuredClone(initial);
    function replay() {
      const prepared = applyCommand(initial, { type: "prepareMonsterAction", actorId: "m" });
      expect(prepared.state.battle!.monsterAction).toMatchObject({ targetId: "h2", skillSlot: 1 });
      expect(prepared.state.battle!.rngCursor).toBe(0);
      const moved = applyCommand(prepared.state, { type: "moveMonsterToRange", actorId: "m" });
      expect(moved.state.battle!.entities.find((e) => e.id === "m")!.areaId).toBe("c");
      expect(moved.state.battle!.rngCursor).toBe(0);
      const played = applyCommand(moved.state, {
        type: "playMonsterSkill",
        actorId: "m",
        targetId: "h2",
        skillSlot: 1,
      });
      expect(played.events.some((e) => e.type === "commandRefused")).toBe(false);
      expect(played.state.battle!.rngCursor).toBe(1);
      expect(played.state.battle!.entities.find((e) => e.id === "h2")!.wounds).toBe(8);
      expect(played.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
      const duplicate = applyCommand(played.state, {
        type: "playMonsterSkill",
        actorId: "m",
        targetId: "h2",
        skillSlot: 1,
      });
      expect(duplicate.events[0]?.type).toBe("commandRefused");
      expect(duplicate.state).toBe(played.state);
      return played;
    }
    expect(replay()).toEqual(replay());
    expect(initial).toEqual(before);
    const invalid = applyCommand(setup(withBonus(2)), {
      type: "prepareMonsterAction",
      actorId: "m",
    }).state;
    const refused = applyCommand(invalid, { type: "moveMonsterToRange", actorId: "m" });
    expect(refused.events[0]?.type).toBe("commandRefused");
    expect(refused.state).toBe(invalid);
  });
});
