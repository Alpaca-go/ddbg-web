import { expect, it } from "vitest";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createBattleState } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { readMonsterSelfStatuses } from "./monster-self-status";
import { resolveMonsterSkill } from "./monster-skill";
import { statusProjection } from "./status";
import type { StatusStack } from "./status";

const card = (id: string) => sources.catalog.monsters.find((entry) => entry.id === id)!;
const raider = card("monster_medium:p056");
const hunter = card("monster_medium:p059");
const adder = card("monster_large:p004");

/** Q-163：R-196 补齐 Speed/选招后，DL3 三张普通怪八招按 FRONT 面逐招接入。 */
it("DL3 三怪八招效果计划与印刷整行一致", () => {
  expect(raider.skills.map((skill) => skill.verified_monster_effects?.effects)).toEqual([
    [{ type: "status", scope: "target", kind: "debuff", duration: 2 }],
    [{ type: "status", scope: "target", kind: "bleed", amount: 3, duration: 2 }],
    [
      { type: "status", scope: "self", kind: "buff", duration: 2 },
      { type: "shuffle", scope: "self", direction: "pull", distance: 1 },
    ],
  ]);
  expect(hunter.skills.map((skill) => skill.verified_monster_effects?.effects)).toEqual([
    [
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
    [{ type: "shuffle", scope: "self", direction: "push", distance: 1 }],
  ]);
  expect(adder.skills.map((skill) => skill.verified_monster_effects?.effects)).toEqual([
    [{ type: "status", scope: "target", kind: "blight", amount: 3, duration: 4 }],
    [{ type: "status", scope: "target", kind: "stun", duration: 1 }],
    [
      { type: "status", scope: "self", kind: "buff", duration: 2 },
      { type: "heal", scope: "self", amount: 9 },
      { type: "cleanse", scope: "self", kinds: ["bleed", "blight"] },
    ],
  ]);
});

it("Adder Molt 走纯自身路径：Buff 2t、Heal 9、Remove 流血与枯萎", () => {
  expect(readMonsterSelfStatuses(adder, 3)).toEqual({
    status: "ready",
    effects: [{ kind: "buff", duration: 2 }],
    selfHeal: 9,
    cleanse: true,
  });
  expect(readMonsterSelfStatuses(adder, 1)).toEqual({ status: "notSelf" });
  expect(readMonsterSelfStatuses(adder, 2)).toEqual({ status: "notSelf" });
});

/** 命中/落空均由既有攻击结算器判定；这里只验证效果原语接上，不改自然策略或种子。 */
it("Adder 的 Blight 3 / 4t 与 Stun 1t 只在命中时施加", () => {
  for (const [slot, range, effect] of [
    [1, 2, { kind: "blight", amount: 3, duration: 4 }],
    [2, 1, { kind: "stun", duration: 1 }],
  ] as const) {
    const hit = resolveMonsterSkill(
      adder,
      slot,
      {
        actor: { id: "m", wounds: 0 },
        target: { id: "h", side: "hero", wounds: 0, stress: 0, dodge: 0 },
        areaDistance: range,
      },
      1,
    );
    if (hit.status !== "resolved") throw new Error(hit.reason);
    expect(hit.resolution.outcome, `${slot}`).toBe("crit");
    expect(hit.resolution.targetStatusEffects).toEqual([effect]);
    expect(hit.resolution.skipped).toEqual([]);
    const miss = resolveMonsterSkill(
      adder,
      slot,
      {
        actor: { id: "m", wounds: 0 },
        target: { id: "h", side: "hero", wounds: 0, stress: 0, dodge: 30 },
        areaDistance: range,
      },
      10,
    );
    if (miss.status !== "resolved") throw new Error(miss.reason);
    expect(miss.resolution.outcome, `${slot}`).toBe("miss");
    expect(miss.resolution.targetStatusEffects ?? []).toEqual([]);
  }
});

const stacks: readonly StatusStack[] = [
  { kind: "bleed", amount: 2, remaining: 2 },
  { kind: "blight", amount: 2, remaining: 2 },
  { kind: "debuff", remaining: 1 },
];

function moltSetup(seed: number): GameState {
  const d = createCoreDungeonQuest(seed, "quest:p001", "standard", coreParty, sources).dungeon!;
  const b = createBattleState(seed, {
    ...sources.catalog,
    light: 5,
    monsters: [adder],
    entities: [
      ...d.heroes.map((hero) => ({
        id: hero.id,
        hero: sources.catalog.heroStats.find((stat) => stat.id === hero.heroStatId)!.name,
        side: "hero" as const,
        heroStatId: hero.heroStatId!,
        heroLevel: 1,
        life: hero.life!,
        wounds: 0,
        stress: 0,
        dodge: 0,
        stance: hero.stance!,
        skillIds: hero.skillIds!,
        areaId: "a",
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      })),
      {
        id: "m",
        hero: null,
        side: "monster" as const,
        monsterCardId: adder.id,
        life: adder.life,
        wounds: 10,
        dodge: adder.dodge ?? 0,
        stance: "defensive" as const,
        stanceSlots: 2,
        areaId: "b",
        dead: false,
        statusStacks: stacks,
        ...statusProjection(stacks),
        skillIds: [],
        shuffleResist: true,
      },
    ],
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal" as const, capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal" as const, capacity: 8 },
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

it("Molt 命令一次结算：治疗 9、Buff 2t 入场，Remove 清空 Bleed/Blight 全部堆叠", () => {
  const select: Command = { type: "prepareMonsterAction", actorId: "m" };
  const seed = Array.from({ length: 200 }, (_, i) => i).find((candidate) => {
    const roll = nextBattleRoll(candidate, 0);
    return roll >= 8 && roll <= 10;
  })!;
  const initial = moltSetup(seed);
  const result = applyCommand(initial, select);
  expect(
    result.events.find((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBeUndefined();
  const monster = result.state.battle!.entities.find((entry) => entry.id === "m")!;
  expect(monster.statusStacks).toEqual([
    { kind: "debuff", remaining: 1 },
    { kind: "buff", remaining: 2 },
  ]);
  expect(monster.bleed).toEqual([]);
  expect(monster.blight).toEqual([]);
  expect(monster.wounds).toBe(1);
  expect(monster.buffStacks).toBe(1);
  expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
  expect(result.events.find((event) => event.type === "monsterSelfSkillResolved")).toMatchObject({
    actorId: "m",
    skillSlot: 3,
    effects: [{ kind: "buff", duration: 2 }],
    selfHeal: 9,
    cleanse: true,
  });
  expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  // 只消费一次选招骰；同一输入可回放。
  expect(applyCommand(initial, select)).toEqual(result);
});
