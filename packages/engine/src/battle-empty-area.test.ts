import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type {
  BattleEntity,
  GameState,
  HeroSkillCardView,
  PlayHeroSkillEmptyAreaCommand,
} from "./index";

const cards = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards as HeroSkillCardView[];
const card = (page: string) => cards.find((s) => s.id === `hero_skill:${page}`)!;
function setup(skill = card("p097"), guarded = false): GameState {
  const hero: BattleEntity = {
    id: "vestal",
    side: "hero",
    hero: skill.hero!,
    stance: "support",
    areaId: "a",
    skillIds: [skill.id],
    wounds: 5,
    stress: 5,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const state = createBattleState(1, {
    skills: [skill],
    light: 4,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 4, elevation: "normal" },
      { id: "b", adjacent: ["a", "c"], capacity: 4, elevation: "normal" },
      { id: "c", adjacent: ["b"], capacity: 4, elevation: "normal" },
      { id: "island", adjacent: [], capacity: 4, elevation: "normal" },
    ],
    entities: [
      hero,
      { ...hero, id: "ally", stance: "ranged", skillIds: [] },
      {
        id: "enemy",
        side: "monster",
        hero: null,
        stance: "aggressive",
        stanceSlots: 1,
        areaId: "c",
        skillIds: [],
        guard: guarded,
        life: 10,
        wounds: 0,
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
        turn: { type: "hero", actorId: "vestal", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const command = (state: GameState, areaId = "b"): PlayHeroSkillEmptyAreaCommand => ({
  type: "playHeroSkillEmptyArea",
  actorId: "vestal",
  skillId: state.battle!.skills[0]!.id,
  areaId,
});
function refused(state: GameState, cmd = command(state)) {
  const result = applyCommand(state, cmd);
  expect(result.state).toBe(state);
  expect(result.events).toMatchObject([{ type: "commandRefused" }]);
  expect(result.events).toHaveLength(1);
  return result;
}

describe("空区域英雄技能（R19–20、R-025、R-048）", () => {
  it("真实 Divine Comfort 自身治疗照常；空区域不产生目标命中、暴击、压力或伤口", () => {
    const state = setup();
    const result = applyCommand(state, command(state));
    expect(result.events[0]).toMatchObject({
      type: "heroSkillEmptyAreaResolved",
      areaId: "b",
      roll: 7,
    });
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(result.state.battle!.entities[0]).toMatchObject({ wounds: 3, stress: 5 });
    expect(result.state.battle!.entities.slice(1)).toEqual(state.battle!.entities.slice(1));
    expect(result.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [card("p097").id],
    });
    refused(result.state, command(result.state));
    expect(state.battle!.entities[0]!.wounds).toBe(5);
  });
  it("真实 Pistol Shot 已核实区间可选空区；不施加条件伤害或目标效果", () => {
    const state = setup(card("p067"));
    const result = applyCommand(state, command(state));
    expect(result.events[0]?.type).toBe("heroSkillEmptyAreaResolved");
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(result.state.battle!.entities).toEqual(state.battle!.entities);
    expect(result.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
  });
  it("低骰也不产生虚构暴击；第二行动收尾与同种子命令回放一致", () => {
    const initial = { ...setup(), seed: 7 };
    const actions = [
      command(initial),
      { type: "changeStance" as const, actorId: "vestal", direction: "forward" as const },
    ];
    const replay = () => actions.reduce((state, cmd) => applyCommand(state, cmd).state, initial);
    const first = applyCommand(initial, actions[0]!);
    expect(first.events[0]).toMatchObject({ roll: 1 });
    expect(first.state.battle!.entities[0]!.stress).toBe(5);
    expect(replay()).toEqual(replay());
    expect(replay().battle!.encounter!.turn.type).toBe("awaitingInitiative");
  });
  it("满区域、未知区域、断图、错误射程与 Guard 不消耗行动或 RNG", () => {
    const state = setup();
    for (const areaId of ["a", "c", "missing", "island"]) refused(state, command(state, areaId));
    const guarded = setup(card("p067"), true);
    expect(refused(guarded).events[0]?.message).toContain("Guard");
    const far = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.side === "monster" ? { ...e, areaId: "a" } : e,
        ),
      },
    };
    refused(far, command(far, "c"));
  });
  it("未验证、缺 numeric / duration、错误姿态、Self 和自身位移整次拒绝", () => {
    const original = card("p097");
    refused(setup({ ...original, verification: { unverified: true } }));
    refused(
      setup({
        ...original,
        unlabeled_numbers: original.unlabeled_numbers.map((n) => ({ ...n, numeric: null })),
      }),
    );
    refused(setup(card("p010")));
    const breakthrough = setup(card("p034"));
    const high = {
      ...breakthrough,
      battle: {
        ...breakthrough.battle!,
        areas: breakthrough.battle!.areas.map((a) =>
          a.id === "a" ? { ...a, elevation: "high" as const } : a,
        ),
      },
    };
    expect(refused(high).events[0]?.message).toContain("自身位移");
    expect(refused(setup(card("p088"))).events[0]?.message).toContain("numeric 为 null");
    const stun = card("p007");
    const stunState = setup(stun);
    const inRange = {
      ...stunState,
      battle: {
        ...stunState.battle!,
        entities: stunState.battle!.entities.map((e) =>
          e.id === "vestal" ? { ...e, stance: "aggressive" as const } : e,
        ),
        areas: stunState.battle!.areas.map((a) =>
          a.id === "a" ? { ...a, elevation: "high" as const } : a,
        ),
      },
    };
    const valid = applyCommand(inRange, command(inRange));
    expect(valid.events[0]?.type).toBe("heroSkillEmptyAreaResolved");
    expect(valid.state.battle!.entities).toEqual(inRange.battle!.entities);
    const missingDuration = {
      ...inRange,
      battle: { ...inRange.battle!, skills: [{ ...stun, verified_status_effects: [] }] },
    };
    expect(refused(missingDuration).events[0]?.message).toContain("未完整支持");
    const badStance = setup();
    refused({
      ...badStance,
      battle: {
        ...badStance.battle!,
        entities: badStance.battle!.entities.map((e) =>
          e.id === "vestal" ? { ...e, stance: "aggressive" as const } : e,
        ),
      },
    });
  });
});
