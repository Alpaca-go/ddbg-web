import { applyPassiveHero } from "./passive-runtime";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, BattleSetup, GameState, HeroSkillCardView } from "./index";
import { readPrintedRange } from "./hero-skill";
import { nextBattleRoll } from "./encounter";

const cards = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards as HeroSkillCardView[];
const heal = cards.find((card) => card.id === "hero_skill:p013")!;
const profiles = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_stat.json", import.meta.url), "utf8"),
).cards as (NonNullable<BattleSetup["heroStats"]>[number] & { level: number; dodge: number })[];
const monsterLife: number = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards.find((card: { id: string }) => card.id === "monster_medium:p001").life;
const crusader = profiles.find((p) => p.name === "CRUSADER" && p.level === 1)!;
const vestal = profiles.find((p) => p.name === "VESTAL" && p.level === 1)!;
function ready(roll = 3, distance = 1, wounds = vestal.life): GameState {
  let seed = 0;
  while (nextBattleRoll(seed, 0) !== roll) seed++;
  const actor: BattleEntity = {
    id: "crusader",
    side: "hero",
    hero: crusader.name,
    heroStatId: crusader.id,
    life: crusader.life,
    stance: "aggressive",
    areaId: "a",
    wounds: 5,
    stress: 3,
    dodge: crusader.dodge,
    guard: false,
    dead: false,
    skillIds: [heal.id],
    bleed: [],
    blight: [],
  };
  const state = createBattleState(seed, {
    skills: [heal],
    light: 5,
    // 生命属性只取现有已核实目录，测试不补默认 Life。
    heroStats: profiles,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 4, elevation: "normal" },
      { id: "b", adjacent: ["a", "c"], capacity: 4, elevation: "normal" },
      { id: "c", adjacent: ["b"], capacity: 4, elevation: "normal" },
    ],
    entities: [
      actor,
      {
        ...actor,
        id: "vestal",
        hero: vestal.name,
        heroStatId: vestal.id,
        life: vestal.life,
        stance: "support",
        skillIds: [],
        areaId: ["a", "b", "c"][distance]!,
        wounds,
        // 高 Dodge 制造非暴击落空；Guard / 反击 / 防护不改变友方治疗。
        dodge: 5,
        guard: true,
        riposte: true,
        protection: true,
      },
      {
        id: "monster",
        hero: null,
        life: monsterLife,
        side: "monster",
        stance: "aggressive",
        stanceSlots: 1,
        areaId: "c",
        wounds: 0,
        skillIds: [],
        guard: true,
        dodge: 0,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
  });
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "crusader", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const command = {
  type: "playHeroSkill",
  actorId: "crusader",
  targetId: "vestal",
  skillId: heal.id,
} as const;

describe("Battle Heal I 逐卡复核（SKILLS_FRONT p13、R19–20、R-022 / R-025 / R-048）", () => {
  it("0–1 射程四种姿态可用，高地仅扩上限；无注解区间仍拒绝，II 区间与 III 单值分别核实", () => {
    expect(readPrintedRange(heal)).toEqual({ kind: "interval", min: 0, max: 1 });
    expect(heal.effect_lines).toEqual([]);
    for (const stance of ["aggressive", "defensive", "ranged", "support"] as const)
      for (const lower of [false, true])
        for (const distance of [0, 1, 2, 3]) {
          const result = resolveHeroSkill(
            heal,
            {
              actor: { id: "c", stance, wounds: 5, stress: 3 },
              target: { id: "v", side: "hero", wounds: 5, dodge: 0 },
              light: 5,
              areaDistance: distance,
              targetAreaLower: lower,
            },
            3,
          );
          expect(result.status).toBe(
            distance <= (lower ? 2 : 1) && !(lower && distance === 0) ? "resolved" : "refused",
          );
        }
    const { verified_range, ...without } = heal;
    expect(verified_range).toEqual({ min: 0, max: 1, source: "print_front" });
    expect(readPrintedRange(without)).toEqual({ kind: "null_numeric" });
    expect(cards.find((c) => c.id === "hero_skill:p014")!.verified_range).toMatchObject({
      min: 0,
      max: 1,
    });
    expect(readPrintedRange(cards.find((c) => c.id === "hero_skill:p015")!)).toEqual({
      kind: "exact",
      distance: 1,
    });
  });

  it("公共命令十个骰面：治疗离开死门、友方 Dodge 落空、暴击压力和单骰回放", () => {
    for (let roll = 1; roll <= 10; roll++) {
      const state = ready(roll);
      const before = structuredClone(state);
      const used = applyCommand(state, command);
      // 光照 5 让英雄 Dodge +1，实际命中阈值 12 - (5 + 1) = 6。
      const outcome = roll <= 2 ? "crit" : roll <= 6 ? "hit" : "miss";
      const amount = outcome === "crit" ? 4 : outcome === "hit" ? 2 : 0;
      expect(used.events[0]).toMatchObject({
        type: "heroSkillResolved",
        roll,
        resolution: { outcome, effect: "heal", damageDealt: null, riposteDamage: null },
      });
      expect(used.state.battle!.entities[1]).toMatchObject({
        wounds: vestal.life - amount,
        dead: false,
        stress: 3,
      });
      expect(used.state.battle!.entities[0]).toMatchObject({
        wounds: 5,
        stress: outcome === "crit" ? 2 : 3,
      });
      expect(used.state.battle!.entities[2]).toEqual(state.battle!.entities[2]);
      const health = used.events.filter((event) => event.type === "heroHealthResolved");
      expect(health).toHaveLength(amount ? 1 : 0);
      if (amount)
        expect(health[0]).toMatchObject({
          entityId: "vestal",
          resolution: { leftDeathDoor: true, face: null },
        });
      expect(used.state.battle!.rngCursor).toBe(1);
      expect(used.state.battle!.encounter!.turn).toMatchObject({
        actions: 1,
        usedSkillIds: amount ? [heal.id] : [],
      });
      expect(applyCommand(state, command)).toEqual(used);
      expect(state).toEqual(before);
      if (amount) expect(applyCommand(used.state, command).state).toBe(used.state);
      else {
        const repeat = applyCommand(used.state, command);
        expect(repeat.events[0]?.type).toBe("heroSkillResolved");
        expect(repeat.state.battle!.rngCursor).toBe(2);
        expect(repeat.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
      }
    }
  });

  it("同区自身只治疗一次，超额治疗封零；空区扣行动但不虚构治疗或暴击压力", () => {
    const state = ready(1, 0, 1);
    const healed = applyCommand(state, command);
    expect(healed.state.battle!.entities[1]!.wounds).toBe(0);
    const self = applyCommand(state, { ...command, targetId: "crusader" });
    expect(self.state.battle!.entities[0]!.wounds).toBe(1);
    expect(self.events.filter((event) => event.type === "heroHealthResolved")).toHaveLength(1);
    expect(self.state.battle!.entities[1]!.wounds).toBe(1);
    const emptyCommand = {
      type: "playHeroSkillEmptyArea",
      actorId: "crusader",
      skillId: heal.id,
      areaId: "b",
    } as const;
    const empty = applyCommand(state, emptyCommand);
    expect(empty.events[0]).toMatchObject({ type: "heroSkillEmptyAreaResolved", roll: 1 });
    expect(empty.state.battle!.entities).toEqual(state.battle!.entities);
    expect(empty.state.battle!.rngCursor).toBe(1);
    expect(empty.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [heal.id],
    });
    expect(applyCommand(state, emptyCommand)).toEqual(empty);
    expect(applyCommand(empty.state, emptyCommand).state).toBe(empty.state);
  });

  it("错误射程、非英雄、未装备、未验证与无射程注解在 RNG 前原子拒绝", () => {
    const state = ready();
    const { verified_range: _range, ...unreviewed } = heal;
    void _range;
    for (const blocked of [
      ready(3, 2),
      { ...state, battle: { ...state.battle!, skills: [unreviewed] } },
      {
        ...state,
        battle: { ...state.battle!, skills: [{ ...heal, verification: { unverified: true } }] },
      },
      {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) =>
            e.id === "crusader" ? { ...e, skillIds: [] } : e,
          ),
        },
      },
    ]) {
      const rejected = applyCommand(blocked, command);
      expect(rejected.state).toBe(blocked);
      expect(rejected.events).toMatchObject([{ type: "commandRefused" }]);
    }
    expect(applyCommand(state, { ...command, targetId: "monster" }).state).toBe(state);
  });
});

describe("Unholy Aura 治疗窗口（R-067）", () => {
  it("施术者或接收者在禁疗区时整次拒绝，未耗骰、行动或补给；离区可治疗", () => {
    for (const areaId of ["a", "b"]) {
      const original = ready();
      const state = {
        ...original,
        battle: {
          ...original.battle!,
          provisions: [{ id: "food", face: "food" as const }],
          areas: original.battle!.areas.map((a) =>
            a.id === areaId ? { ...a, healingForbidden: true as const } : a,
          ),
        },
      };
      const rejected = applyCommand(state, command);
      expect(rejected.events).toContainEqual(
        expect.objectContaining({
          type: "commandRefused",
          message: expect.stringContaining("Unholy Aura"),
        }),
      );
      expect(rejected.state).toEqual(state);
      const targetId = areaId === "a" ? "crusader" : "vestal";
      const provision = applyCommand(state, {
        type: "useProvision",
        provisionId: "food",
        targetId,
        effect: "heal",
      });
      expect(provision.state).toEqual(state);
      expect(provision.events[0]?.type).toBe("commandRefused");
      const outside = {
        ...state,
        battle: {
          ...state.battle!,
          areas: state.battle!.areas.map((a) => {
            const updated = { ...a };
            delete updated.healingForbidden;
            return updated;
          }),
        },
      };
      expect(applyCommand(outside, command).events[0]?.type).toBe("heroSkillResolved");
    }
  });
  it("多目标治疗含一个禁疗接收者时整次拒绝，不能只治疗其他人", () => {
    const original = ready(3, 0);
    const state = {
      ...original,
      battle: {
        ...original.battle!,
        areas: original.battle!.areas.map((a) =>
          a.id === "a" ? { ...a, healingForbidden: true as const } : a,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "playHeroSkillTargets",
      actorId: "crusader",
      skillId: heal.id,
      targetIds: ["vestal"],
    });
    expect(result.events[0]?.type).toBe("commandRefused");
    expect(result.state).toEqual(state);
  });
});

it("Unholy Aura 阻止 Warrior of Light 治疗，同行 Early Riser 的 Buff 继续生效（R-067）", () => {
  const hero = {
    id: "h",
    life: 10,
    wounds: 5,
    stress: 3,
    heroLevel: 1,
    quirkIds: ["quirk:p002", "quirk:p013"],
    statusStacks: [],
  };
  const result = applyPassiveHero(
    hero,
    "lightRaised",
    1,
    0,
    4,
    [],
    { resistances: [], immunities: [] },
    {
      healingForbidden: true,
    },
  );
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") throw new Error(result.reason);
  expect(result.hero.wounds).toBe(5);
  expect(result.hero.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
  expect(result.cursor).toBe(0);
  expect(result.events).toContainEqual(expect.objectContaining({ type: "healingPrevented" }));
});
