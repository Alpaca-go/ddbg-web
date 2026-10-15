import { expect, it } from "vitest";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createBattleState } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { readMonsterAttackView, resolveMonsterSkill } from "./monster-skill";
import { attachVerifiedMonsterEffects } from "../../data/src/normalize/verified-monster-effects";
import large from "../../data/normalized/corebox/monster_large.json";
import { normalizedMonsterLargeFileSchema } from "../../data/src/normalize/schema";

const card = sources.catalog.monsters.find((c) => c.id === "monster_large:p003")!;
const seedFor = (roll: number) =>
  Array.from({ length: 1000 }, (_, i) => i).find((seed) => nextBattleRoll(seed, 0) === roll)!;
const combat = {
  actor: { id: "m", wounds: 0 },
  target: { id: "h", side: "hero" as const, wounds: 0, stress: 0, dodge: 0 },
  light: 5,
};
function setup(slot: number, roll = 3): GameState {
  const seed = seedFor(roll);
  const d = createCoreDungeonQuest(seed, "quest:p001", "standard", coreParty, sources).dungeon!;
  const initial = createBattleState(seed, {
    ...sources.catalog,
    resolveCards: sources.resolveCards,
    monsters: [card],
    light: 5,
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
        monsterCardId: card.id,
        life: 26,
        wounds: 0,
        dodge: 1,
        stance: "aggressive",
        stanceSlots: 2,
        areaId: slot === 1 ? "a" : "b",
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        skillIds: [],
        innateProtection: true,
        protection: true,
        shuffleResist: true,
      },
    ],
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
    ],
  });
  return {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        actedIds: [],
        deck: ["hero"],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}
const command = (state: GameState, slot: number) => ({
  type: "playMonsterSkill" as const,
  actorId: "m",
  targetId: state.battle!.entities.find((e) => e.side === "hero")!.id,
  skillSlot: slot,
});
const ok = (state: GameState, c: Command) => {
  const result = applyCommand(state, c);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
};

it("Ghoul两招印刷阈值、伤害、完整状态和压力黄金表；落空无目标效果", () => {
  for (const slot of [1, 2]) {
    for (let roll = 1; roll <= 10; roll++) {
      const result = resolveMonsterSkill(card, slot, { ...combat, areaDistance: slot - 1 }, roll);
      if (result.status !== "resolved") throw new Error(result.reason);
      // R-002：光照5为英雄增加1 Dodge，Acc9的实际命中阈值为8。
      const hit = roll <= 8,
        crit = roll <= (slot === 1 ? 2 : 1);
      expect(result.resolution).toMatchObject({
        outcome: hit ? (crit ? "crit" : "hit") : "miss",
        damageDealt: hit ? (crit ? 12 : 7) : null,
        targetStress: hit ? (crit ? 2 : 1) : 0,
        targetShuffle: null,
        actorShuffle: null,
        skipped: [],
      });
      expect(result.resolution.targetStatusEffects ?? []).toEqual(
        !hit
          ? []
          : slot === 1
            ? [
                { kind: "bleed", amount: 3, duration: 2 },
                { kind: "debuff", duration: 2 },
              ]
            : [{ kind: "stun", duration: 2 }],
      );
    }
  }
});

it("真实Rend/Skull Toss一骰完成伤害状态压力并结束怪物回合，原命令确定性回放", () => {
  for (const slot of [1, 2]) {
    const initial = setup(slot),
      before = structuredClone(initial),
      c = command(initial, slot);
    const result = ok(initial, c),
      hero = result.state.battle!.entities.find((e) => e.id === c.targetId)!;
    expect(hero).toMatchObject({ wounds: 7, stress: 1, dead: false });
    // Crusader抗Stun，Skull Toss持续时间由2t减为1t。
    expect(hero.statusStacks).toEqual(
      slot === 1
        ? [
            { kind: "bleed", amount: 3, remaining: 2 },
            { kind: "debuff", remaining: 2 },
          ]
        : [{ kind: "stun", remaining: 1 }],
    );
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(applyCommand(initial, c)).toEqual(result);
    expect(initial).toEqual(before);
    expect(applyCommand(result.state, c).state).toBe(result.state);
  }
});

it("两招真实落空只消费攻击骰与回合，不施伤害压力状态", () => {
  for (const slot of [1, 2]) {
    const state = setup(slot, 10),
      c = command(state, slot);
    const result = ok(state, c);
    expect(result.state.battle!.entities.find((e) => e.id === c.targetId)).toMatchObject({
      wounds: 0,
      stress: 0,
      bleed: [],
      blight: [],
    });
    expect(result.state.battle!.rngCursor).toBe(1);
  }
});

it("两招压力到10沿既有意志检定收尾；已有意志卡则心脏病，不重复抽卡", () => {
  for (const slot of [1, 2]) {
    for (const tested of [false, true]) {
      const initial = setup(slot),
        c = command(initial, slot);
      const state = {
        ...initial,
        battle: {
          ...initial.battle!,
          entities: initial.battle!.entities.map((e) =>
            e.id === c.targetId
              ? {
                  ...e,
                  stress: 9,
                  resolveTested: tested,
                  resolveCardId: tested ? sources.resolveCards[0]!.id : null,
                }
              : e,
          ),
        },
      };
      const before = structuredClone(state),
        result = ok(state, c);
      const hero = result.state.battle!.entities.find((e) => e.id === c.targetId)!;
      expect(hero.resolveCardId).toBeTruthy();
      expect(hero.resolveTested).toBe(true);
      expect(hero.dead).toBe(tested);
      expect(result.events.some((e) => e.type === "heartAttack")).toBe(tested);
      expect(result.state.battle!.rngCursor).toBe(tested ? 1 : 6);
      expect(applyCommand(state, c)).toEqual(result);
      expect(state).toEqual(before);
    }
  }
});

it("攻击死门致死后取消状态，不复活英雄；Rend和Skull Toss均可回放", () => {
  for (const slot of [1, 2]) {
    let state = setup(slot);
    const c = command(state, slot);
    // 仅选择既有死门骰会致死的种子，不改骰面或RNG实现。
    let lethal: ReturnType<typeof applyCommand> | undefined;
    for (let seed = 0; seed < 100 && !lethal; seed++) {
      if (nextBattleRoll(seed, 0) !== 3) continue;
      state = {
        ...state,
        seed,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) =>
            e.id === c.targetId ? { ...e, wounds: e.life! } : e,
          ),
        },
      };
      const result = ok(state, c);
      if (result.state.battle!.entities.find((e) => e.id === c.targetId)!.dead) lethal = result;
    }
    expect(lethal).toBeDefined();
    const dead = lethal!.state.battle!.entities.find((e) => e.id === c.targetId)!;
    expect(dead.statusStacks ?? []).toEqual([]);
    expect(dead.bleed).toEqual([]);
    expect(applyCommand(state, c)).toEqual(lethal);
  }
});

it("计划签名、原语数值及作用域漂移均原子拒绝，保留骰序与当前回合", () => {
  for (const slot of [1, 2]) {
    const skill = card.skills.find((s) => s.slot === slot)!,
      plan = skill.verified_monster_effects!;
    for (const changed of [
      { ...plan, signatures: ["wrong"] },
      { ...plan, effects: plan.effects.slice(1) },
      {
        ...plan,
        effects: plan.effects.map((e) => (e.type === "stress" ? { ...e, amount: 2 } : e)),
      },
      {
        ...plan,
        effects: plan.effects.map((e) =>
          e.type === "status" ? { ...e, scope: "self" as const } : e,
        ),
      },
    ]) {
      const initial = setup(slot);
      const state = {
        ...initial,
        battle: {
          ...initial.battle!,
          monsters: [
            {
              ...card,
              skills: card.skills.map((s) =>
                s.slot === slot ? { ...s, verified_monster_effects: changed } : s,
              ),
            },
          ],
        },
      };
      const before = structuredClone(state),
        result = applyCommand(state, command(state, slot));
      expect(result.state).toBe(state);
      expect(result.events).toEqual([expect.objectContaining({ type: "commandRefused" })]);
      expect(state).toEqual(before);
    }
  }
});

it("规范化映射限定Ghoul II p3身份与完整原始行，不接受重命名/等级/页码漂移", () => {
  const cards = normalizedMonsterLargeFileSchema.parse(large).cards;
  for (const fields of [{ name: "Bone Captain" }, { level: 3 }, { pages: [4] }])
    expect(() =>
      attachVerifiedMonsterEffects(
        cards.map((c) => (c.id === card.id ? { ...c, ...fields } : c)),
        true,
      ),
    ).toThrow("身份不符");
  expect(() =>
    attachVerifiedMonsterEffects(
      cards.map((c) =>
        c.id === card.id
          ? { ...c, skills: c.skills.map((s) => (s.slot === 1 ? { ...s, effect_lines: [] } : s)) }
          : c,
      ),
      true,
    ),
  ).toThrow("效果行未核实");
});

it("Howl完整计划逐名续接，未知签名仍整次拒绝", () => {
  expect(card.skills.find((s) => s.slot === 3)!.verified_monster_effects).toBeDefined();
  const attack = readMonsterAttackView(card, 3);
  expect(attack.status).toBe("ready");
  const initial = setup(3);
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      monsters: [
        {
          ...card,
          skills: card.skills.map((s) =>
            s.slot === 3
              ? {
                  ...s,
                  verified_monster_effects: {
                    ...s.verified_monster_effects!,
                    signatures: ["wrong"],
                  },
                }
              : s,
          ),
        },
      ],
    },
  };
  const before = structuredClone(state);
  const result = applyCommand(state, command(state, 3));
  expect(result.state).toBe(state);
  expect(result.events).toEqual([expect.objectContaining({ type: "commandRefused" })]);
  expect(state).toEqual(before);
});
