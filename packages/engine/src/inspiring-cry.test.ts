import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, BattleSetup, HeroSkillCardView } from "./index";
import { attachVerifiedHeroSupport } from "../../data/src/normalize/verified-hero-support";
import type { NormalizedHeroSkillCard } from "../../data/src/normalize/schema";

const cards = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards as NormalizedHeroSkillCard[];
const rawCry = cards.find((c) => c.id === "hero_skill:p019")!;
const cry = rawCry as HeroSkillCardView;
const context = {
  actor: { id: "c", stance: "aggressive" as const, wounds: 5, stress: 3 },
  target: { id: "h", side: "hero" as const, wounds: 5, stress: 3, dodge: 99 },
  areaDistance: 0,
  targetsInArea: 1,
  light: 2,
};
function ready(withLife = false) {
  const stats = JSON.parse(
    readFileSync(new URL("../../data/normalized/corebox/hero_stat.json", import.meta.url), "utf8"),
  ).cards as NonNullable<BattleSetup["heroStats"]>;
  const stat = stats.find((c) => c.name === "CRUSADER" && c.life === 17)!;
  const actor: BattleEntity = {
    id: "c",
    hero: "CRUSADER",
    side: "hero",
    areaId: "a",
    stance: "aggressive",
    skillIds: [cry.id],
    wounds: 5,
    stress: 3,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(withLife ? { heroStatId: stat.id, life: stat.life } : {}),
  };
  const initial = createBattleState(5, {
    ...(withLife ? { heroStats: [stat] } : {}),
    skills: [cry],
    light: 2,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 4, elevation: "normal" },
      { id: "b", adjacent: ["a"], capacity: 4, elevation: "normal" },
    ],
    entities: [
      actor,
      ...(["defensive", "ranged", "support"] as const).map((stance, i) => ({
        ...actor,
        id: `h${i}`,
        stance,
        skillIds: [],
      })),
      {
        id: "m",
        hero: null,
        side: "monster",
        areaId: "b",
        wounds: 0,
        life: 10,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        skillIds: [],
      },
    ],
  });
  return {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster" as const],
        actedIds: [],
        turn: { type: "hero" as const, actorId: "c", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const play = { type: "playHeroSkill", actorId: "c", targetId: "h0", skillId: cry.id } as const;

describe("Inspiring Cry I（印刷 p19、规则书 R19–21、R-025 / R-048）", () => {
  it("独立注解保留原始 null；数据漂移不得生成注解", () => {
    expect(cry.unlabeled_numbers.find((n) => n.text === "+1")?.numeric).toBeNull();
    expect(cry.verified_target_support).toEqual({
      lineIndex: 1,
      heal: 1,
      stress: -1,
      light: 1,
      source: "print_front",
    });
    for (const changed of [
      { ...rawCry, name: "Other" },
      { ...rawCry, level: 2 as const },
      { ...rawCry, verification: { unverified: true, reasons: ["test"] } },
      { ...rawCry, effect_lines: [] },
    ])
      expect(() => attachVerifiedHeroSupport([changed])).toThrow();
  });
  it("四姿态、全部骰面不掷骰或暴击；治疗减压封零，友方 Dodge 无影响", () => {
    for (const stance of ["aggressive", "defensive", "ranged", "support"] as const)
      for (let roll = 1; roll <= 10; roll++) {
        const result = resolveHeroSkill(
          cry,
          { ...context, actor: { ...context.actor, stance } },
          roll,
        );
        expect(result.reason).toBeNull();
        expect(result).toMatchObject({
          status: "resolved",
          outcome: null,
          wounds: 4,
          targetStress: 2,
          actorWounds: 5,
          actorStress: 3,
          targetLightDelta: 1,
        });
        expect(result.skipped).not.toContainEqual({ code: "effect_lines" });
      }
    expect(
      resolveHeroSkill(
        cry,
        { ...context, target: { ...context.target, wounds: 0, stress: 0 }, light: 5 },
        1,
      ),
    ).toMatchObject({ wounds: 0, targetStress: 0 });
  });
  it("没有注解、缺轨、错配、敌方与超射程均拒绝", () => {
    const unknown = { ...cry };
    delete unknown.verified_target_support;
    expect(resolveHeroSkill(unknown, context, 1).status).toBe("refused");
    const target = { id: "h", side: "hero" as const, wounds: 5, dodge: 0 };
    const { light: ignoredLight, ...dark } = context;
    void ignoredLight;
    for (const combat of [
      { ...context, target },
      dark,
      { ...context, areaDistance: 1 },
      { ...context, target: { ...context.target, side: "monster" as const } },
    ])
      expect(resolveHeroSkill(cry, combat, 1).status).toBe("refused");
    const forged: HeroSkillCardView = {
      ...cry,
      verified_target_support: { ...cry.verified_target_support!, light: 2 },
    };
    expect(resolveHeroSkill(forged, context, 1).status).toBe("refused");
  });
  it("公共单目标 / 集合写回一次，无 RNG；自身目标减压、回放和成功重用锁", () => {
    for (const targetId of ["c", "h0"]) {
      const state = ready();
      const command = { ...play, targetId };
      const result = applyCommand(state, command);
      expect(result.events[0]).not.toMatchObject({ type: "commandRefused" });
      expect(result.events[0]).toMatchObject({ type: "heroSkillResolved", roll: null });
      expect(result.state.battle!.entities.find((e) => e.id === targetId)).toMatchObject({
        wounds: 4,
        stress: 2,
      });
      expect(result.state.battle!).toMatchObject({
        light: 3,
        rngCursor: 0,
        encounter: { turn: { actions: 1, usedSkillIds: [cry.id] } },
      });
      expect(applyCommand(state, command)).toEqual(result);
      expect(applyCommand(result.state, command).state).toEqual(result.state);
      const many = applyCommand(state, {
        type: "playHeroSkillTargets",
        actorId: "c",
        targetIds: [targetId],
        skillId: cry.id,
      });
      expect(many.state.battle!.entities).toEqual(result.state.battle!.entities);
      expect(many.state.battle!.light).toBe(3);
    }
    const state = ready();
    expect(
      applyCommand({ ...state, battle: { ...state.battle!, light: 5 } }, play).state.battle!.light,
    ).toBe(5);
    expect(applyCommand(state, { ...play, targetId: "missing" }).state).toEqual(state);
  });
  it("高地可选空区域只耗行动，不虚构目标治疗减压或光照", () => {
    const state = ready();
    const empty = {
      ...state,
      battle: {
        ...state.battle!,
        areas: state.battle!.areas.map((a) => ({
          ...a,
          elevation: a.id === "a" ? ("high" as const) : ("low" as const),
        })),
        entities: state.battle!.entities.filter((e) => e.side === "hero"),
      },
    };
    const result = applyCommand(empty, {
      type: "playHeroSkillEmptyArea",
      actorId: "c",
      areaId: "b",
      skillId: cry.id,
    });
    expect(result.events[0]).toMatchObject({ type: "heroSkillEmptyAreaResolved", roll: null });
    expect(result.state.battle!.entities).toEqual(empty.battle.entities);
    expect(result.state.battle!).toMatchObject({ light: 2, rngCursor: 0 });
  });
  it("已核实英雄生命层：治疗离开死门、不掷死门骰，自身 / 集合不重复治疗", () => {
    for (const targetId of ["c", "h0"]) {
      const state = ready(true);
      const atDoor = {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) =>
            e.id === targetId ? { ...e, wounds: e.life! } : e,
          ),
        },
      };
      const single = applyCommand(atDoor, { ...play, targetId });
      const many = applyCommand(atDoor, {
        type: "playHeroSkillTargets",
        actorId: "c",
        targetIds: [targetId],
        skillId: cry.id,
      });
      for (const result of [single, many]) {
        expect(result.state.battle!.entities.find((e) => e.id === targetId)).toMatchObject({
          wounds: 16,
          stress: 2,
          dead: false,
        });
        expect(result.state.battle!.rngCursor).toBe(0);
      }
    }
  });
});
