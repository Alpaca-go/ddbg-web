import { expect, it } from "vitest";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createBattleState } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { readMonsterSelfStatuses } from "./monster-self-status";
import { resolveMonsterSkill } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
const card = sources.catalog.monsters.find((c) => c.id === "monster_medium:p053")!;
const select: Command = { type: "prepareMonsterAction", actorId: "m" };
const seedFor = (self: boolean) =>
  Array.from({ length: 100 }, (_, i) => i).find((seed) => nextBattleRoll(seed, 0) > 5 === self)!;
function setup(
  seed = seedFor(true),
  stance: "aggressive" | "support" = "aggressive",
  monster: MonsterCardView = card,
): GameState {
  const d = createCoreDungeonQuest(seed, "quest:p001", "standard", coreParty, sources).dungeon!;
  const b = createBattleState(seed, {
    ...sources.catalog,
    light: 5,
    monsters: [monster],
    entities: [
      ...d.heroes.map((h) => ({
        id: h.id,
        hero: sources.catalog.heroStats.find((s) => s.id === h.heroStatId)!.name,
        side: "hero" as const,
        heroStatId: h.heroStatId!,
        heroLevel: 1,
        life: h.life!,
        wounds: 0,
        stress: 0,
        dodge: 0,
        stance: h.stance!,
        skillIds: h.skillIds!,
        areaId: "a",
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      })),
      {
        id: "m",
        hero: null,
        side: "monster",
        monsterCardId: monster.id,
        life: monster.life,
        wounds: 0,
        dodge: 2,
        stance,
        stanceSlots: 1,
        areaId: "b",
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        skillIds: [],
        shuffleResist: true,
      },
    ],
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
    ],
  });
  return {
    ...b,
    battle: {
      ...b.battle!,
      encounter: {
        round: 1,
        actedIds: [],
        deck: ["hero"],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}
const ok = (s: GameState, c: Command) => {
  const r = applyCommand(s, c);
  expect(
    r.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBeUndefined();
  return r;
};
it("Snakebite伤害8/5与2 Bleed3t；Slither Forward伤害4/2且自身Pull2受抗性减为1", () => {
  for (const [slot, range, crit, normal] of [
    [2, 1, 8, 5],
    [3, 2, 4, 2],
  ] as const) {
    for (const [roll, damage] of [
      [1, slot === 3 ? normal : crit],
      [3, normal],
    ]) {
      const r = resolveMonsterSkill(
        card,
        slot,
        {
          actor: { id: "m", wounds: 0, shuffleResist: true },
          target: { id: "h", side: "hero", wounds: 0, stress: 0, dodge: 0 },
          areaDistance: range,
        },
        roll!,
      );
      if (r.status !== "resolved") throw new Error(r.reason);
      expect(r.resolution.skipped).toEqual([]);
      expect(r.resolution.damageDealt).toBe(damage);
      expect(r.resolution.actorShuffle).toEqual(
        slot === 3 ? { direction: "pull", distance: 1 } : null,
      );
      expect(r.resolution.targetStatusEffects ?? []).toEqual(
        slot === 2 ? [{ kind: "bleed", amount: 2, duration: 3 }] : [],
      );
    }
  }
});
it("真实Slither Forward命令完成自身抗性Pull1后只结算一次攻击", () => {
  const base = setup(seedFor(true), "support");
  const initial: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "c" } : e)),
      areas: [
        { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
        { id: "b", adjacent: ["a", "c"], elevation: "normal", capacity: 8 },
        { id: "c", adjacent: ["b"], elevation: "normal", capacity: 8 },
      ],
    },
  };
  const selected = ok(initial, select);
  expect(selected.state.battle!.monsterAction).toMatchObject({ skillSlot: 3 });
  const positioned = ok(selected.state, { type: "moveMonsterToRange", actorId: "m" });
  const attack = ok(positioned.state, {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "hero-0",
    skillSlot: 3,
  });
  const done = ok(attack.state, { type: "resolveShuffles" });
  expect(done.state.battle!.entities.find((e) => e.id === "m")).toMatchObject({
    areaId: "b",
    stance: "ranged",
  });
  expect(done.state.battle!.rngCursor).toBe(2);
  expect(done.state.battle!.entities.find((e) => e.id === "hero-0")!.wounds).toBe(2);
  expect(done.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
});
it("Warning Rattle反击按真实Smite伤害7返4，不重掷攻击骰", () => {
  const result = ok(setup(1), select);
  const { encounter: _encounter, ...battle } = result.state.battle!;
  void _encounter;
  const command: Command = {
    type: "playHeroSkill",
    actorId: "hero-0",
    targetId: "m",
    skillId: "hero_skill:p001",
  };
  const free: GameState = {
    ...result.state,
    battle: { ...battle, entities: battle.entities.map((e) => ({ ...e, areaId: "a" })) },
  };
  const attacked = ok(free, command);
  expect(attacked.state.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(7);
  expect(attacked.state.battle!.entities.find((e) => e.id === "hero-0")!.wounds).toBe(4);
  expect(attacked.state.battle!.rngCursor).toBe(2);
});
it("真实Warning Rattle完整读取三种状态；没有伪造攻击射程、目标或骰面", () => {
  expect(readMonsterSelfStatuses(card, 1)).toEqual({
    status: "ready",
    effects: [
      { kind: "buff", duration: 2 },
      { kind: "guard", duration: 1 },
      { kind: "riposte", duration: 1 },
    ],
  });
  expect(readMonsterSelfStatuses(card, 2)).toEqual({ status: "notSelf" });
});
it("选到自身技能只消费选招骰，状态施加后结束一次，不选英雄、不移动、可回放", () => {
  for (const [seed, stance] of [
    [seedFor(true), "aggressive"],
    [seedFor(false), "support"],
  ] as const) {
    const initial = setup(seed, stance),
      before = structuredClone(initial);
    const result = ok(initial, select);
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(result.state.battle!.entities.find((e) => e.id === "m")).toMatchObject({
      wounds: 0,
      areaId: "b",
      stance,
      buffStacks: 1,
      guard: true,
      riposte: true,
      statusStacks: [
        { kind: "buff", remaining: 2 },
        { kind: "guard", remaining: 1 },
        { kind: "riposte", remaining: 1 },
      ],
    });
    expect(result.state.battle!.entities.filter((e) => e.side === "hero")).toEqual(
      initial.battle!.entities.filter((e) => e.side === "hero"),
    );
    expect(result.state.battle!.monsterAction).toBeNull();
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    expect(result.events.find((e) => e.type === "monsterSelfSkillResolved")).toMatchObject({
      selectionRoll: nextBattleRoll(seed, 0),
      skillSlot: 1,
    });
    expect(
      result.events.some(
        (e) => e.type === "monsterSkillResolved" || e.type === "monsterActionPrepared",
      ),
    ).toBe(false);
    expect(applyCommand(initial, select)).toEqual(result);
    expect(applyCommand(result.state, select).state).toBe(result.state);
    expect(initial).toEqual(before);
  }
});
it("自身技能不受Guard英雄或断图目标干扰；下一怪物回合Guard/Riposte消退，Buff剩1t", () => {
  const base = setup();
  const initial: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      areas: base.battle!.areas.map((a) => ({ ...a, adjacent: [] })),
      entities: base.battle!.entities.map((e) => (e.side === "hero" ? { ...e, guard: true } : e)),
    },
  };
  const self = ok(initial, select).state;
  const next: GameState = {
    ...self,
    battle: {
      ...self.battle!,
      encounter: {
        round: 2,
        actedIds: [],
        deck: ["monster", "hero"],
        turn: { type: "awaitingInitiative" },
      },
    },
  };
  const ticked = ok(next, { type: "drawInitiative" });
  expect(ticked.state.battle!.entities.find((e) => e.id === "m")).toMatchObject({
    statusStacks: [{ kind: "buff", remaining: 1 }],
    buffStacks: 1,
    guard: false,
    riposte: false,
  });
  expect(ticked.state.battle!.rngCursor).toBe(1);
});
it("攻击分支仍保存正常英雄目标和选招骰，不施加Warning Rattle状态", () => {
  const initial = setup(seedFor(false));
  const r = ok(initial, select);
  expect(r.state.battle!.monsterAction).toMatchObject({
    actorId: "m",
    skillSlot: 2,
    targetId: "hero-0",
  });
  expect(r.state.battle!.entities.find((e) => e.id === "m")!.statusStacks).toBeUndefined();
  expect(r.state.battle!.rngCursor).toBe(1);
  expect(applyCommand(r.state, select).state).toBe(r.state);
});
it("缺计划、伪造范围/Acc、签名漂移或未验证卡原子拒绝，不消耗选招RNG", () => {
  const skill = card.skills[0]!;
  const { verified_monster_effects: _plan, ...withoutPlan } = skill;
  void _plan;
  for (const changed of [
    withoutPlan,
    { ...skill, printed_labels: [{ label: "Acc" as const, value: 9, raw: "Acc 9" }] },
    {
      ...skill,
      unlabeled_numbers: [
        { text: "0", numeric: 0, anchor: { type: "printed_label" as const, label: "Range" } },
      ],
    },
    { ...skill, effect_lines: [] },
  ]) {
    const invalid = { ...card, skills: [changed, ...card.skills.slice(1)] };
    const initial = setup(seedFor(true), "aggressive", invalid),
      before = structuredClone(initial);
    expect(readMonsterSelfStatuses(invalid, 1).status).toBe("refused");
    expect(applyCommand(initial, select).state).toBe(initial);
    expect(initial).toEqual(before);
  }
  const unverified = { ...card, verification: { unverified: true } };
  expect(readMonsterSelfStatuses(unverified, 1).status).toBe("refused");
});
