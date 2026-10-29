import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { applyCommand } from "../command";
import type { ApplyResult, Command, GameState } from "../command";
import { createBattleState } from "../battle";
import type { BattleEntity } from "../battle";
import type { MonsterCardView } from "../monster-skill";
import type { HeroSkillCardView } from "../hero-skill";
import { createLootState } from "../loot";
import { nextBattleRoll } from "../battle-roll";
import { NECROMANCER_I_SCRIPT_ID } from "./necromancer-i";
import {
  NECROMANCER_II_SCRIPT_ID,
  ensureNecromancerIIBossScriptRegistered,
} from "./necromancer-ii";
import { continueNecromancerISummon } from "./necromancer-i-combat-runtime";

function cards<T>(file: string): T[] {
  return JSON.parse(
    readFileSync(new URL(`../../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards;
}
const monsters = cards<MonsterCardView>("monster_medium");
const smite = cards<HeroSkillCardView>("hero_skill").find((c) => c.id === "hero_skill:p001")!;
const stances = ["aggressive", "defensive", "ranged", "support"] as const;
function monster(id: string, card: MonsterCardView, index: number, areaId = "b"): BattleEntity {
  return {
    id,
    monsterCardId: card.id,
    life: card.life,
    side: "monster",
    stance: stances[index]!,
    stanceSlots: 1,
    areaId,
    hero: null,
    skillIds: [],
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
}
function setupLevel(level: 1 | 2): GameState {
  const necromancer = monsters.find(
    (c) => c.id === (level === 1 ? "monster_medium:p089" : "monster_medium:p090"),
  )!;
  const rabble = monsters.find(
    (c) => c.id === (level === 1 ? "monster_medium:p040" : "monster_medium:p001"),
  )!;
  const initial = createBattleState(5, {
    entities: [
      ...stances.map((stance, index): BattleEntity => ({
        id: `h${index}`,
        side: "hero",
        hero: "CRUSADER",
        skillIds: [smite.id],
        areaId: "a",
        stance,
        wounds: 0,
        stress: 0,
        dodge: 0,
        dead: false,
        guard: false,
        bleed: [],
        blight: [],
      })),
      monster("necro", necromancer, 0),
    ],
    areas: [
      { id: "a", adjacent: ["b"], capacity: 8, elevation: "normal" },
      { id: "b", adjacent: ["a", "c"], capacity: 8, elevation: "normal" },
      { id: "c", adjacent: ["b"], capacity: 8, elevation: "normal" },
    ],
    skills: [smite],
    monsters: [necromancer, rabble],
    light: 5,
    lootPool: createLootState(),
  });
  return {
    ...initial,
    dungeon: {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      campaignLevel: level,
      questDistribution: { questId: "quest:p019", campaignLevel: level },
      activeBossThreatScriptId: level === 1 ? NECROMANCER_I_SCRIPT_ID : NECROMANCER_II_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster", "hero", "hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "necro" },
      },
    },
  };
}
function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
function attack(state: GameState, slot = 1): ApplyResult {
  if (slot === 2)
    state = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) => (e.id === "necro" ? { ...e, areaId: "c" } : e)),
      },
    };
  let result = ok(state, {
    type: "playMonsterSkill",
    actorId: "necro",
    targetId: "h0",
    skillSlot: slot,
  });
  if (result.state.battle!.shuffleIntents.length) {
    const resumed = ok(result.state, { type: "resolveShuffles" });
    result = { ...resumed, events: [...result.events, ...resumed.events] };
  }
  return result;
}
describe.each([1, 2] as const)("C-011/019 · Necromancer %i（R38、R-034）", (level) => {
  beforeEach(() => {
    if (level === 2) ensureNecromancerIIBossScriptRegistered();
  });
  const necromancer = monsters.find(
    (c) => c.id === (level === 1 ? "monster_medium:p089" : "monster_medium:p090"),
  )!;
  const rabble = monsters.find(
    (c) => c.id === (level === 1 ? "monster_medium:p040" : "monster_medium:p001"),
  )!;
  const setup = () => setupLevel(level);
  const livingRabble = (state: GameState) =>
    state.battle!.entities.filter((e) => e.monsterCardId === rabble.id && !e.dead);
  it.each([1, 2])(
    "真实卡 slot %i：自身 Push 后召唤一次，洗入当前堆，当轮可行动且确定性回放",
    (slot) => {
      const initial = setup();
      const before = structuredClone(initial);
      const result = attack(initial, slot);
      expect(attack(initial, slot)).toEqual(result);
      expect(initial).toEqual(before);
      expect(livingRabble(result.state)).toHaveLength(1);
      expect(livingRabble(result.state)[0]).toMatchObject({
        areaId: "a",
        stance: "aggressive",
        life: level === 1 ? 6 : 7,
        dodge: 0,
      });
      expect(result.state.battle!.entities.find((e) => e.id === "necro")).toMatchObject({
        areaId: "c",
        stance: "defensive",
      });
      expect(result.state.battle!.rngCursor).toBe(2); // 一次技能骰 + 一次插入先攻
      expect(result.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(2);
      expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
      expect(
        result.events.filter(
          (e) => e.type === "monsterSkillTargetsResolved" && e.phase !== "ownPending",
        )[0],
      ).toMatchObject({
        resolutions: [{ wounds: expect.any(Number) }, { wounds: expect.any(Number) }],
      });
      let current = result.state;
      for (let i = 0; i < 4; i++) {
        const next = ok(current, { type: "drawInitiative" });
        if (next.state.battle!.encounter!.turn.type === "monster") {
          expect(next.state.battle!.encounter!.turn).toMatchObject({
            actorId: livingRabble(current)[0]!.id,
          });
          expect(
            ok(next.state, { type: "prepareMonsterAction", actorId: livingRabble(current)[0]!.id })
              .state.battle!.monsterAction,
          ).toMatchObject({ skillSlot: 1 });
          return;
        }
        // 这里只跳过英雄回合，隔离先攻顺序。
        current = {
          ...next.state,
          battle: {
            ...next.state.battle!,
            encounter: { ...next.state.battle!.encounter!, turn: { type: "awaitingInitiative" } },
          },
        };
      }
      throw new Error("当前堆未抽到召唤物");
    },
  );

  it("全部落空不召唤；满轨不召唤也不消费召唤 RNG", () => {
    const initial = setup();
    const missed = attack({
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((e) =>
          e.side === "hero" ? { ...e, dodge: 20 } : e,
        ),
      },
    });
    expect(livingRabble(missed.state)).toHaveLength(0);
    expect(missed.state.battle!.rngCursor).toBe(1);
    const full = attack({
      ...initial,
      battle: {
        ...initial.battle!,
        entities: [
          ...initial.battle!.entities,
          ...[1, 2, 3].map((i) => monster(`r${i}`, rabble, i, "c")),
        ],
      },
    });
    expect(livingRabble(full.state)).toHaveLength(3);
    expect(full.state.battle!.rngCursor).toBe(1);
  });

  it("满区英雄挤占等待选择，续接不重掷、不重复伤害；旧选择拒绝", () => {
    const initial = setup();
    const result = attack({
      ...initial,
      battle: {
        ...initial.battle!,
        areas: initial.battle!.areas.map((a) => (a.id === "a" ? { ...a, capacity: 4 } : a)),
      },
    });
    expect(result.pendingChoice).toBeDefined();
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(livingRabble(result.state)).toHaveLength(0);
    const command: Command = {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: result.pendingChoice!.options[0]!.id,
    };
    const chosen = ok(result.state, command);
    expect(livingRabble(chosen.state)).toHaveLength(1);
    expect(
      chosen.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.wounds),
    ).toEqual(result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.wounds));
    expect(chosen.state.battle!.rngCursor).toBe(2);
    expect(chosen.state.battle!.pending).toBeNull();
    expect(applyCommand(chosen.state, command).state).toBe(chosen.state);
  });

  it("缺召唤卡或未知容量原子拒绝；不猜几何", () => {
    const initial = setup();
    // 自身位移先完成；目标效果续接拒绝时保留已经支付的自身阶段。
    for (const patch of [
      { monsters: [necromancer] },
      {
        areas: initial.battle!.areas.map((a) => ({
          id: a.id,
          adjacent: a.adjacent,
          elevation: a.elevation,
        })),
      },
    ]) {
      const state = { ...initial, battle: { ...initial.battle!, ...patch } };
      const prefix = applyCommand(state, {
        type: "playMonsterSkill",
        actorId: "necro",
        targetId: "h0",
        skillSlot: 1,
      });
      const rejected = prefix.state.battle!.shuffleIntents.length
        ? applyCommand(prefix.state, { type: "resolveShuffles" })
        : prefix;
      expect(rejected.events.some((e) => e.type === "commandRefused")).toBe(true);
      expect(rejected.state).toBe(prefix.state);
      expect(livingRabble(rejected.state)).toHaveLength(0);
    }
  });

  it("区域被怪物占满时选择移走怪物，保持姿态且只补一张当前轮先攻", () => {
    const resolved = attack(setup()).events.find(
      (e) => e.type === "monsterSkillTargetsResolved" && e.phase === "afterOwn",
    )!;
    if (resolved.type !== "monsterSkillTargetsResolved") throw new Error("缺少真实技能事件");
    const initial = setup();
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: [
          ...initial.battle!.entities.map((e) => (e.side === "hero" ? { ...e, areaId: "b" } : e)),
          monster("occupant", rabble, 2, "a"),
        ],
        areas: initial.battle!.areas.map((a) => (a.id === "a" ? { ...a, capacity: 1 } : a)),
      },
    };
    const pending = continueNecromancerISummon(
      { state, events: [] },
      { ...resolved, type: "monsterSkillResolved", resolution: resolved.resolutions[0]! },
      [],
    )!;
    expect(pending.pendingChoice!.options).toEqual([
      { id: JSON.stringify(["occupant", "b"]), label: "occupant → b" },
    ]);
    const chosen = ok(pending.state, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId: pending.pendingChoice!.options[0]!.id,
    });
    expect(chosen.state.battle!.entities.find((e) => e.id === "occupant")).toMatchObject({
      areaId: "b",
      stance: "ranged",
    });
    expect(livingRabble(chosen.state)).toHaveLength(2);
    expect(chosen.state.battle!.rngCursor).toBe(1);
  });

  it.each(["attack", "blight"])(
    "%s 击败 Necromancer：伴战全清且战斗胜利，旧尸体不重复移除",
    (cause) => {
      let state = setup();
      state = {
        ...state,
        battle: {
          ...state.battle!,
          entities: [
            ...state.battle!.entities.map((e) =>
              e.id === "necro"
                ? {
                    ...e,
                    areaId: "a",
                    wounds: necromancer.life - 1,
                    ...(cause === "blight"
                      ? { statusStacks: [{ kind: "blight" as const, remaining: 1, amount: 1 }] }
                      : {}),
                  }
                : e,
            ),
            monster("alive", rabble, 1),
            { ...monster("old", rabble, 2), dead: true },
          ],
          encounter: {
            ...state.battle!.encounter!,
            turn:
              cause === "attack"
                ? { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] }
                : { type: "awaitingInitiative" },
            deck: ["monster"],
          },
        },
      };
      while (nextBattleRoll(state.seed, state.battle!.rngCursor) > 5)
        state = { ...state, battle: { ...state.battle!, rngCursor: state.battle!.rngCursor + 1 } };
      const result = ok(
        state,
        cause === "attack"
          ? { type: "playHeroSkill", actorId: "h0", targetId: "necro", skillId: smite.id }
          : { type: "drawInitiative" },
      );
      expect(result.state.battle!.encounter!.turn).toEqual({
        type: "finished",
        outcome: "victory",
      });
      expect(result.state.battle!.entities.find((e) => e.id === "alive")).toMatchObject({
        dead: true,
        wounds: 0,
      });
      expect(
        result.events.flatMap((e) => (e.type === "casualtyRemoved" ? [e.actorId] : [])),
      ).toEqual(["necro", "alive"]);
      expect(result.state.battle!.encounter!.deck).toEqual([]);
    },
  );

  it("未确认的第三招效果仍整次拒绝", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.id === "necro" ? { ...e, areaId: "c" } : e)),
        monsters: base.battle!.monsters!.map((c) =>
          c.id === necromancer.id
            ? {
                ...c,
                skills: c.skills.map((s) =>
                  s.slot === 3 ? { ...s, effect_lines: [...s.effect_lines, []] } : s,
                ),
              }
            : c,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "playMonsterSkill",
      actorId: "necro",
      targetId: "h0",
      skillSlot: 3,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(state);
  });
});
