import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity, type BattleSetup } from "../battle";
import { applyCommand, type ApplyResult, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { selectMonsterSkill } from "../monster-stance";
import type { MonsterCardView } from "../monster-skill";
import { NECROMANCER_I_SCRIPT_ID } from "./necromancer-i";
import {
  NECROMANCER_II_SCRIPT_ID,
  ensureNecromancerIIBossScriptRegistered,
} from "./necromancer-ii";

import {
  NECROMANCER_III_SCRIPT_ID,
  ensureNecromancerIIIBossScriptRegistered,
} from "./necromancer-iii";

function cards<T>(file: string): T[] {
  return JSON.parse(
    readFileSync(new URL(`../../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards;
}
const monsters = cards<MonsterCardView>("monster_medium");
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const resolves = cards<NonNullable<BattleSetup["resolveCards"]>[number]>("virtue_affliction");
const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
function setupLevel(slot = 3, attackRoll = 5, level: 1 | 2 | 3 = 1): GameState {
  const necro = monsters.find((c) => c.id === `monster_medium:p0${88 + level}`)!;
  const rabble = monsters.find(
    (c) =>
      c.id ===
      (level === 1
        ? "monster_medium:p040"
        : level === 2
          ? "monster_medium:p001"
          : "monster_medium:p013"),
  )!;
  const seed = 7;
  const cursor = Array.from({ length: 2000 }, (_, i) => i).find(
    (i) =>
      nextBattleRoll(seed, i) === [1, 4, 7][slot - 1] && nextBattleRoll(seed, i + 1) === attackRoll,
  )!;
  expect(cursor).toBeDefined();
  const initial = createBattleState(seed, {
    entities: [
      ...stances.map((stance, i): BattleEntity => {
        const stat = profiles.find(
          (s) => s.name === names[i] && s.level === 1 && s.attributesVerified,
        )!;
        return {
          id: `h${i}`,
          side: "hero",
          hero: stat.name,
          heroStatId: stat.id,
          life: stat.life,
          areaId: "a",
          stance,
          skillIds: [],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        };
      }),
      {
        id: "necro",
        side: "monster",
        hero: null,
        monsterCardId: necro.id,
        life: necro.life,
        areaId: "d",
        stance: "aggressive",
        stanceSlots: 1,
        shuffleResist: true,
        skillIds: [],
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: ["a", "b", "c", "d", "e"].map((id, i, ids) => ({
      id,
      capacity: 8,
      elevation: "normal",
      adjacent: ids.filter((_, n) => Math.abs(n - i) === 1),
    })),
    monsters: [necro, rabble],
    skills: [],
    heroStats: profiles,
    resolveCards: resolves,
    light: 5,
  });
  return {
    ...initial,
    dungeon: {
      phase: "inBattle",
      heroes: [],
      cursor: 0,
      questDistribution: { questId: "quest:p019" },
      campaignLevel: level,
      imminentThreatDescriptionCardId:
        level === 1 ? "boss_ability:p001" : level === 2 ? "boss_ability:p002" : "boss_ability:p003",
      activeBossThreatScriptId:
        level === 1
          ? NECROMANCER_I_SCRIPT_ID
          : level === 2
            ? NECROMANCER_II_SCRIPT_ID
            : NECROMANCER_III_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...initial.battle!,
      rngCursor: cursor,
      resolveDecks: {},
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: "necro" },
      },
    },
  };
}
function perform(state: GameState): ApplyResult {
  const prepared = ok(state, { type: "prepareMonsterAction", actorId: "necro" });
  const positioned = ok(prepared.state, { type: "moveMonsterToRange", actorId: "necro" });
  const action = positioned.state.battle!.monsterAction!;
  let result = ok(positioned.state, {
    type: "playMonsterSkill",
    actorId: "necro",
    targetId: action.targetId,
    skillSlot: action.skillSlot,
  });
  const events = [...prepared.events, ...positioned.events, ...result.events];
  while (result.state.battle!.shuffleIntents.length) {
    result = ok(result.state, { type: "resolveShuffles" });
    events.push(...result.events);
  }
  return { ...result, events };
}
const targets = (result: ApplyResult) =>
  result.events.flatMap((e) =>
    e.type === "monsterSkillTargetsResolved" && e.phase !== "ownPending" ? e.resolutions : [],
  );
const heroes = (state: GameState) => state.battle!.entities.filter((e) => e.side === "hero");

describe.each([1, 2, 3] as const)("C-012/019 · Necromancer %i 卡面选招与三招公开命令", (level) => {
  beforeEach(() => {
    if (level === 2) ensureNecromancerIIBossScriptRegistered();
    if (level === 3) ensureNecromancerIIIBossScriptRegistered();
  });
  const necro = monsters.find((c) => c.id === `monster_medium:p0${88 + level}`)!;
  const rabble = monsters.find(
    (c) =>
      c.id ===
      (level === 1
        ? "monster_medium:p040"
        : level === 2
          ? "monster_medium:p001"
          : "monster_medium:p013"),
  )!;
  const setup = (slot = 3, roll = 5) => setupLevel(slot, roll, level);
  const summoned = (state: GameState) =>
    state.battle!.entities.filter((e) => e.monsterCardId === rabble.id && !e.dead);
  it("Speed 3、四姿态全部十面按印刷表选招；不从 footer 动态猜表", () => {
    expect(necro.speed).toBe(3);
    for (const stance of stances)
      for (let roll = 1; roll <= 10; roll++) {
        expect(selectMonsterSkill(necro, [stance], roll)).toMatchObject({
          status: "selected",
          skillSlot: roll <= 3 ? 1 : roll <= 6 ? 2 : 3,
        });
      }
  });
  it.each([1, 2, 3])(
    "slot %i：选招、Crowded、移动、共骰、自身抗性、召唤与收尾确定且不改输入",
    (slot) => {
      const state = setup(slot),
        before = structuredClone(state),
        result = perform(state);
      expect(result).toEqual(perform(state));
      expect(state).toEqual(before);
      expect(result.events.find((e) => e.type === "monsterPositioned")).toMatchObject({
        from: "d",
        to: slot === 1 ? "b" : "c",
        steps: slot === 1 ? 2 : 1,
      });
      expect(result.state.battle!.entities.find((e) => e.id === "necro")).toMatchObject({
        stance: "aggressive",
        areaId: slot === 1 ? "b" : "c",
      });
      expect(targets(result)).toHaveLength(slot === 3 ? 4 : 2);
      expect(summoned(result.state)).toHaveLength(1);
      expect(summoned(result.state)[0]).toMatchObject({
        areaId: "a",
        stance: "defensive",
        life: level === 1 ? 6 : level === 2 ? 7 : 15,
        dodge: level === 3 ? 1 : 0,
      });
      expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 3);
      expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
      expect(heroes(result.state).map((e) => e.stress)).toEqual(
        slot === 3 ? [2, 2, 2, 2] : [0, 0, 0, 0],
      );
      if (slot === 3) expect(heroes(result.state).map((e) => e.wounds)).toEqual([0, 0, 0, 0]);
    },
  );
  it("Six Feet Under 无 Crit、无伤害：低光照及 Buff 也不虚构暴击，纯压力不触发 Riposte", () => {
    const base = setup(3, 1);
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        light: 0,
        entities: base.battle!.entities.map((e) =>
          e.id === "necro" ? { ...e, buffStacks: 10 } : { ...e, riposte: true },
        ),
      },
    };
    const result = perform(state);
    expect(targets(result).every((r) => r.outcome === "hit")).toBe(true);
    expect(heroes(result.state).map((e) => [e.stress, e.wounds])).toEqual([
      [3, 0],
      [3, 0],
      [3, 0],
      [3, 0],
    ]);
    expect(result.state.battle!.entities.find((e) => e.id === "necro")!.wounds).toBe(0);
    expect(result.events.filter((e) => e.type === "heroHealthResolved")).toEqual([]);
  });
  it("四目标共骰逐名闪避，有人落空仍只召唤一次", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "h1" ? { ...e, dodge: 10, guard: true } : e,
        ),
      },
    };
    const result = perform(state);
    expect(targets(result).find((r) => r.targetId === "h1")!.outcome).toBe("miss");
    expect(heroes(result.state).map((e) => e.stress)).toEqual([2, 0, 2, 2]);
    expect(summoned(result.state)).toHaveLength(1);
  });
  it("全落空时不加压力、不召唤，只消费选招与攻击骰并结束一次回合", () => {
    const base = setup(3, 10);
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.side === "hero" ? { ...e, dodge: 10 } : e)),
      },
    };
    const result = perform(state);
    expect(targets(result).every((r) => r.outcome === "miss")).toBe(true);
    expect(heroes(result.state).map((e) => e.stress)).toEqual([0, 0, 0, 0]);
    expect(summoned(result.state)).toEqual([]);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 2);
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  });
  it("目标满区待选后不重复攻击或压力；有效选择只续接一次召唤和先攻", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        areas: base.battle!.areas.map((a) => (a.id === "a" ? { ...a, capacity: 4 } : a)),
      },
    };
    const pending = perform(state);
    expect(pending.state.battle!.pending?.type).toBe("necromancerSummon");
    expect(summoned(pending.state)).toEqual([]);
    expect(pending.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 2);
    const done = ok(pending.state, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId: JSON.stringify(["h0", "b"]),
    });
    expect(heroes(done.state).map((e) => e.stress)).toEqual([2, 2, 2, 2]);
    expect(summoned(done.state)).toHaveLength(1);
    expect(done.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 3);
    expect(done.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    const repeated = applyCommand(done.state, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId: JSON.stringify(["h0", "b"]),
    });
    expect(repeated.state).toBe(done.state);
  });
  it("满姿态轨仍执行压力但召唤无效，不消费召唤 RNG", () => {
    const base = setup(),
      actor = base.battle!.entities.find((e) => e.id === "necro")!;
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: [
          ...base.battle!.entities,
          ...stances.slice(1).map((stance, i) => ({
            ...actor,
            id: `existing-${i}`,
            monsterCardId: rabble.id,
            life: rabble.life,
            stance,
          })),
        ],
      },
    };
    const result = perform(state);
    expect(summoned(result.state)).toHaveLength(3);
    expect(heroes(result.state).map((e) => e.stress)).toEqual([2, 2, 2, 2]);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 2);
    expect(
      result.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("姿态轨已满")),
    ).toBe(true);
  });
  it("压力达到10走统一心脏病与卡牌回收，纯压力不加伤口", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "h0"
            ? { ...e, stress: 8, resolveTested: true, resolveCardId: resolves[0]!.id }
            : e,
        ),
      },
    };
    const result = perform(state);
    expect(result.state.battle!.entities.find((e) => e.id === "h0")).toMatchObject({
      dead: true,
      wounds: 0,
    });
    expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
    expect(result.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(1);
    expect(summoned(result.state)).toHaveLength(1);
  });
  it("缺少 Speed 时移动拒绝，不猜默认值或重选技能", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        monsters: base.battle!.monsters!.map((c) => {
          if (c.id !== necro.id) return c;
          const { speed, ...rest } = c;
          void speed;
          return rest;
        }),
      },
    };
    const prepared = ok(state, { type: "prepareMonsterAction", actorId: "necro" });
    const result = applyCommand(prepared.state, { type: "moveMonsterToRange", actorId: "necro" });
    expect(result.state).toBe(prepared.state);
    expect(result.events[0]!.type).toBe("commandRefused");
  });
  it("其它无伤害怪物不能借用 Six Feet Under 的限定入口", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "necro" ? { ...e, monsterCardId: "unreviewed:stress-monster", areaId: "c" } : e,
        ),
        monsters: base.battle!.monsters!.map((c) =>
          c.id === necro.id ? { ...c, id: "unreviewed:stress-monster" } : c,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "playMonsterSkill",
      actorId: "necro",
      targetId: "h0",
      skillSlot: 3,
    });
    expect(result.state).toBe(state);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(heroes(result.state).map((e) => e.stress)).toEqual([0, 0, 0, 0]);
  });
});
