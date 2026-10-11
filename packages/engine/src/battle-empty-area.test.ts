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
  it("真实 Judgement 可对空区使用，自疗一次并锁重用，低骰不虚构伤害或暴击压力", () => {
    const state = { ...setup(card("p088")), seed: 7 };
    const used = applyCommand(state, command(state));
    expect(used.events[0]).toMatchObject({ type: "heroSkillEmptyAreaResolved", roll: 1 });
    expect(used.state.battle!.entities[0]).toMatchObject({ wounds: 3, stress: 5 });
    expect(used.state.battle!.entities.slice(1)).toEqual(state.battle!.entities.slice(1));
    expect(used.state.battle!.rngCursor).toBe(1);
    expect(used.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [card("p088").id],
    });
    refused(used.state);
    expect(applyCommand(state, command(state))).toEqual(used);
  });
  it("真实 Breakthrough 自身 Pull 参照空区，位移完成才扣行动，目标效果不施加", () => {
    const initial = setup(card("p034"));
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: initial.battle!.areas.map((a) =>
          a.id === "a" ? { ...a, elevation: "high" as const } : a,
        ),
      },
    };
    const used = applyCommand(state, command(state));
    expect(used.state.battle!.shuffleIntents).toEqual([
      { entityId: "vestal", relativeToAreaId: "b", move: { direction: "pull", distance: 1 } },
    ]);
    expect(used.state.battle!.entities).toEqual(state.battle!.entities);
    expect(used.state.battle!.encounter!.turn).toMatchObject({ actions: 2, usedSkillIds: [] });
    refused(used.state);
    const done = applyCommand(used.state, { type: "resolveShuffles" });
    expect(done.state.battle!.entities[0]).toMatchObject({ areaId: "b", stance: "ranged" });
    expect(done.state.battle!.entities[1]).toMatchObject({ areaId: "a", stance: "support" });
    expect(done.state.battle!.entities[2]).toEqual(state.battle!.entities[2]);
    expect(done.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [card("p034").id],
    });
    expect(done.state.battle!.rngCursor).toBe(1);
    expect(done.state.battle!.shuffleContinuation).toBeNull();
    refused(done.state);
  });
  it("真实 Duelist’s Advance 空区 Pull 分岔只应用一次自身状态和骰面，等待冻结并可回放", () => {
    const initial = setup(card("p079"));
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: [
          { id: "a", adjacent: ["b", "c"], capacity: 4, elevation: "high" as const },
          { id: "b", adjacent: ["a", "d"], capacity: 4, elevation: "normal" as const },
          { id: "c", adjacent: ["a", "d"], capacity: 4, elevation: "normal" as const },
          { id: "d", adjacent: ["b", "c"], capacity: 4, elevation: "normal" as const },
        ],
      },
    };
    const used = applyCommand(state, command(state, "d"));
    const stacks = used.state.battle!.entities[0]!.statusStacks;
    expect(stacks).toHaveLength(1);
    expect(stacks![0]).toMatchObject({ kind: "riposte", remaining: 2 });
    const waiting = applyCommand(used.state, { type: "resolveShuffles" });
    expect(waiting.pendingChoice).toMatchObject({
      actorId: "vestal",
      options: [{ id: "b" }, { id: "c" }],
    });
    expect(waiting.state.battle!.entities[0]!.areaId).toBe("a");
    refused(waiting.state);
    refused(waiting.state, { ...command(state), areaId: "a" });
    for (const cmd of [
      { type: "changeStance" as const, actorId: "vestal", direction: "forward" as const },
      { type: "moveHero" as const, actorId: "vestal", path: ["b"] },
      { type: "resolveShuffles" as const },
      { type: "resolveChoice" as const, choiceId: waiting.pendingChoice!.id, optionId: "d" },
    ]) {
      expect(applyCommand(waiting.state, cmd).state).toBe(waiting.state);
    }
    const choose = {
      type: "resolveChoice" as const,
      choiceId: waiting.pendingChoice!.id,
      optionId: "b",
    };
    const done = applyCommand(waiting.state, choose);
    expect(done.state.battle!.entities[0]).toMatchObject({
      areaId: "b",
      stance: "ranged",
      statusStacks: stacks,
    });
    expect(done.state.battle!.rngCursor).toBe(1);
    expect(done.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    expect(done.events.some((e) => e.type === "heroCritAreaResolved")).toBe(false);
    const replay = [
      command(state, "d"),
      { type: "resolveShuffles" as const },
      choose,
    ].reduce<GameState>((s, cmd) => applyCommand(s, cmd).state, state);
    expect(replay).toEqual(done.state);
    expect(applyCommand(done.state, choose).state).toBe(done.state);
  });
  it("真实 Point Blank Shot 只记自身 Push，空区目标 Push 不创建角色", () => {
    const initial = setup(card("p070"));
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((e) =>
          e.id === "vestal"
            ? { ...e, stance: "aggressive" as const, areaId: "b" }
            : e.id === "ally"
              ? { ...e, areaId: "b" }
              : e,
        ),
        areas: initial.battle!.areas.map((a) =>
          a.id === "b" ? { ...a, elevation: "high" as const } : a,
        ),
      },
    };
    const used = applyCommand(state, command(state, "a"));
    expect(used.state.battle!.shuffleIntents).toEqual([
      { entityId: "vestal", relativeToAreaId: "a", move: { direction: "push", distance: 1 } },
    ]);
    const done = applyCommand(used.state, { type: "resolveShuffles" });
    expect(done.state.battle!.entities[0]).toMatchObject({ areaId: "c", stance: "defensive" });
    expect(done.state.battle!.entities).toHaveLength(3);
    expect(done.state.battle!.entities[2]).toEqual(state.battle!.entities[2]);
  });
  it("空目标区容量为零仍截断区域位移并结算姿态；未知容量在掷骰前原子拒绝", () => {
    const initial = setup(card("p079"));
    const limited = (capacity: number | undefined): GameState => ({
      ...initial,
      battle: {
        ...initial.battle!,
        areas: initial.battle!.areas.map((a) => {
          if (a.id !== "b") return a;
          const { capacity: _capacity, ...rest } = a;
          void _capacity;
          return capacity === undefined ? rest : { ...rest, capacity };
        }),
      },
    });
    const full = limited(0);
    const used = applyCommand(full, command(full));
    const done = applyCommand(used.state, { type: "resolveShuffles" });
    expect(done.state.battle!.entities[0]).toMatchObject({ areaId: "a", stance: "ranged" });
    expect(done.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    expect(done.events[0]).toMatchObject({ type: "shuffleResolved", path: [], stanceSteps: 1 });
    expect(refused(limited(undefined)).events[0]?.message).toContain("容量未核实");
  });
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
  it("未验证、缺 numeric / duration、错误姿态和 Self 整次拒绝", () => {
    const original = card("p097");
    refused(setup({ ...original, verification: { unverified: true } }));
    refused(
      setup({
        ...original,
        unlabeled_numbers: original.unlabeled_numbers.map((n) => ({ ...n, numeric: null })),
      }),
    );
    refused(setup(card("p010")));
    const { verified_range: range, ...unreviewed } = card("p088");
    expect(range).toBeDefined();
    expect(refused(setup(unreviewed)).events[0]?.message).toContain("numeric 为 null");
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
