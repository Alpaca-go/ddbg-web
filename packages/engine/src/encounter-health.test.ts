import { createLootState } from "./loot";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type {
  BattleEntity,
  BattleSetup,
  Command,
  GameState,
  HeroSkillCardView,
  MonsterCardView,
  SkillStance,
} from "./index";
import { nextBattleRoll } from "./encounter";

function cards<T>(file: string): T[] {
  return (
    JSON.parse(
      readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
    ) as { cards: T[] }
  ).cards;
}
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const skills = cards<HeroSkillCardView>("hero_skill");
const smite = skills.find((card) => card.id === "hero_skill:p001")!;
const soldier = cards<MonsterCardView>("monster_medium")[0]!;
const defender = cards<MonsterCardView>("monster_medium").find(
  (card) => card.id === "monster_medium:p010",
)!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function setup(monster = soldier, count = 1, skill = smite): GameState {
  const names =
    skill === smite
      ? ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"]
      : ["HIGHWAYMAN", "HELLION", "CRUSADER", "VESTAL"];
  const heroes: BattleEntity[] = names.map((name, index) => {
    const stat = profiles.find((card) => card.name === name && card.attributesVerified)!;
    return {
      id: `h${index}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      skillIds: index === 0 ? [skill.id] : [],
      areaId: "a",
      stance: stances[index]!,
      wounds: stat.life,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const initial = createBattleState(1, {
    heroStats: profiles,
    skills: [skill],
    monsters: [monster],
    light: 5,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 8, elevation: "normal" },
      { id: "b", adjacent: ["a", "c", "d"], capacity: 8, elevation: "normal" },
      { id: "c", adjacent: ["b"], capacity: 8, elevation: "normal" },
      { id: "d", adjacent: ["b"], capacity: 8, elevation: "normal" },
    ],
    entities: [
      ...heroes,
      ...Array.from({ length: count }, (_, index): BattleEntity => ({
        id: `m${index}`,
        side: "monster",
        hero: null,
        skillIds: [],
        monsterCardId: monster.id,
        life: monster.life,
        areaId: "b",
        stance: stances[index]!,
        stanceSlots: 1,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      })),
    ],
  });
  const started = applyCommand(initial, { type: "startBattle" });
  expect(started.events[0]?.type).toBe("roundStarted");
  return started.state;
}
function entity(state: GameState, id: string) {
  return state.battle!.entities.find((entry) => entry.id === id)!;
}
function patch(state: GameState, id: string, changes: Partial<BattleEntity>): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    },
  };
}
// 合成当前回合，只隔离收尾行为；卡牌 / Life / 技能骰 / 死门仍走真实命令。
function turn(state: GameState, side: "hero" | "monster", cursor?: number): GameState {
  let deathCursor = 0;
  while (
    nextBattleRoll(state.seed, deathCursor) > 5 ||
    nextBattleRoll(state.seed, deathCursor + 1) > 3
  )
    deathCursor += 1;
  return {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor: cursor ?? deathCursor,
      encounter: {
        ...state.battle!.encounter!,
        deck: ["hero", "hero", "hero", "monster"],
        turn:
          side === "hero"
            ? { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] }
            : { type: "monster", actorId: "m0" },
      },
    },
  };
}
const attack = (targetId = "h0"): Command => ({
  type: "playMonsterSkill",
  actorId: "m0",
  targetId,
  skillSlot: 1,
});

describe("英雄生命遭遇战收尾（R24–25、R29、R-030、R-044）", () => {
  it("四名已核实英雄可开战；首次进入死门不补位，也不多掷骰", () => {
    const initial = turn(setup(), "monster");
    const prepared = patch(initial, "h1", { wounds: entity(initial, "h1").life! - 1 });
    const result = applyCommand(prepared, attack("h1"));
    expect(entity(result.state, "h1")).toMatchObject({
      dead: false,
      stance: "defensive",
      wounds: entity(initial, "h1").life,
    });
    expect(result.state.battle!.rngCursor).toBe(prepared.battle!.rngCursor + 1);
    expect(result.events.some((event) => event.type === "casualtyRemoved")).toBe(false);
  });

  it("英雄阵亡只补姿态；完整命令确定回放，输入不变，后续先攻跳过死者", () => {
    const initial = turn(setup(), "monster");
    const before = structuredClone(initial);
    const killed = applyCommand(initial, attack());
    expect(killed).toEqual(applyCommand(initial, attack()));
    expect(initial).toEqual(before);
    expect(entity(killed.state, "h0").dead).toBe(true);
    expect(killed.state.battle!.entities.slice(1, 4).map((entry) => entry.stance)).toEqual(
      stances.slice(0, 3),
    );
    expect(killed.state.battle!.entities.slice(0, 4).every((entry) => entry.areaId === "a")).toBe(
      true,
    );
    expect(killed.events.filter((event) => event.type === "casualtyRemoved")).toHaveLength(1);
    expect(killed.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    const next = applyCommand(killed.state, { type: "drawInitiative" });
    expect(next.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actorId: "h1" });
    expect(
      applyCommand(next.state, {
        type: "playHeroSkill",
        actorId: "h0",
        targetId: "m0",
        skillId: smite.id,
      }).state,
    ).toBe(next.state);
  });

  it("连续两人死亡只补新空位，不再次计算旧尸体", () => {
    const first = applyCommand(turn(setup(), "monster"), attack()).state;
    const second = applyCommand(turn(first, "monster"), attack("h1"));
    expect(entity(second.state, "h2").stance).toBe("aggressive");
    expect(entity(second.state, "h3").stance).toBe("defensive");
    expect(
      second.events
        .filter((event) => event.type === "casualtyRemoved")
        .map((event) => ("actorId" in event ? event.actorId : undefined)),
    ).toEqual(["h1"]);
  });

  it("反击同时杀死行动英雄和目标怪物，双方补位；英雄放弃剩余行动", () => {
    let initial = turn(setup(soldier, 2), "hero");
    initial = patch(initial, "m0", { riposte: true, areaId: "a" });
    const result = applyCommand(initial, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m0",
      skillId: smite.id,
    });
    expect(entity(result.state, "h0").dead).toBe(true);
    expect(entity(result.state, "m0").dead).toBe(true);
    expect(entity(result.state, "h1").stance).toBe("aggressive");
    expect(entity(result.state, "m1")).toMatchObject({ stance: "aggressive", areaId: "b" });
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(result.state.battle!.encounter!.actedIds).toContain("h0");
    expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it("轮末只为存活角色重建先攻，死门骰后才消费洗牌 RNG", () => {
    const initial = turn(setup(), "monster");
    const last = {
      ...initial,
      battle: { ...initial.battle!, encounter: { ...initial.battle!.encounter!, deck: [] } },
    };
    const result = applyCommand(last, attack());
    expect(result.state.battle!.encounter).toMatchObject({
      round: 2,
      actedIds: [],
      turn: { type: "awaitingInitiative" },
    });
    expect(result.state.battle!.encounter!.deck.filter((side) => side === "hero")).toHaveLength(3);
    expect(result.state.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(
      1,
    );
    expect(result.state.battle!.rngCursor).toBe(last.battle!.rngCursor + 2 + 3);
  });

  it.each([1, 4])(
    "第 %s 轮全灭停止单场，不推定逃跑或战役失败，不能再行动 / 重开 / 洗牌",
    (round) => {
      let state = setup();
      state = {
        ...state,
        battle: { ...state.battle!, encounter: { ...state.battle!.encounter!, round } },
      };
      let result = applyCommand(turn(state, "monster"), attack());
      for (let index = 1; index < 4; index += 1) {
        state = turn(result.state, "monster");
        result = applyCommand(state, attack(`h${index}`));
      }
      expect(result.state.battle!.encounter!.turn).toEqual({
        type: "halted",
        reason: "heroesDefeated",
        monstersDefeated: false,
      });
      expect(result.state.battle!.encounter!.deck).toEqual([]);
      expect(result.state.battle!.monsterAction).toBeNull();
      expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 2);
      expect(result.events.filter((event) => event.type === "battleHalted")).toHaveLength(1);
      expect(result.events.some((event) => event.type === "battleFinished")).toBe(false);
      for (const command of [
        attack(),
        { type: "drawInitiative" },
        { type: "startBattle" },
        { type: "finishMonsterTurn", actorId: "m0" },
        { type: "prepareMonsterAction", actorId: "m0" },
        { type: "resolveShuffles" },
      ] as Command[]) {
        expect(applyCommand(result.state, command).state).toBe(result.state);
      }
    },
  );

  it("行动英雄阵亡后仍完成先于伤害的自身位移选择，再结束回合并补位", () => {
    const pointBlank = skills.find((card) => card.id === "hero_skill:p070")!;
    let state = turn(setup(soldier, 2, pointBlank), "hero");
    state = patch(state, "m0", { areaId: "a", riposte: true });
    state = {
      ...state,
      battle: {
        ...state.battle!,
        areas: state.battle!.areas.map((area) => ({
          ...area,
          adjacent:
            area.id === "a"
              ? ["b", "c"]
              : area.id === "b"
                ? ["a", "d"]
                : area.id === "c"
                  ? ["a", "d"]
                  : ["b", "c"],
        })),
      },
    };
    const rolled = applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m0",
      skillId: pointBlank.id,
    });
    expect(entity(rolled.state, "h0").dead).toBe(true);
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(waiting.pendingChoice!.actorId).toBe("h0");
    expect(waiting.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 2 });
    const done = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "b",
    });
    expect(entity(done.state, "h0")).toMatchObject({ dead: true, areaId: "b" });
    expect(
      done.state
        .battle!.entities.filter((entry) => entry.side === "hero" && !entry.dead)
        .map((entry) => entry.stance),
    ).toEqual(stances.slice(0, 3));
    expect(done.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor);
  });

  it("双方最后角色同次技能死亡为 mutualWipeout，保留既有金币但不发奖励（R-068）", () => {
    let state = setup();
    for (let index = 1; index < 4; index += 1)
      state = applyCommand(turn(state, "monster"), attack(`h${index}`)).state;
    state = patch(turn(state, "hero"), "m0", { riposte: true, areaId: "a" });
    const loot = createLootState();
    const [token, ...available] = loot.available;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        loot: {
          ...loot,
          gold: 10,
          available,
          placed: [{ ...token!, areaId: "a", revealed: false }],
        },
      },
    };
    const before = structuredClone(state);
    const result = applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m0",
      skillId: smite.id,
    });
    expect(result.state.battle!.encounter!.turn).toEqual({
      type: "halted",
      reason: "mutualWipeout",
      monstersDefeated: true,
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "battleHalted", haltReason: "mutualWipeout" }),
    );
    expect(
      applyCommand(state, {
        type: "playHeroSkill",
        actorId: "h0",
        targetId: "m0",
        skillId: smite.id,
      }),
    ).toEqual(result);
    expect(result.events.some((event) => event.type === "battleFinished")).toBe(false);
    expect(result.state.battle!.loot).toMatchObject({ gold: 10, placed: [] });
    expect(result.state.battle!.loot!.available).toHaveLength(10);
    expect(result.state.battle!.entities.every((e) => e.dead)).toBe(true);
    expect(applyCommand(result.state, { type: "drawInitiative" }).state).toBe(result.state);
    expect(state).toEqual(before);
  });

  it("死亡记录跨自身位移分岔保存，待选不补位，续接只补一次且不重掷", () => {
    const base = turn(setup(defender), "monster");
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 1 || nextBattleRoll(base.seed, cursor + 1) > 3)
      cursor += 1;
    const initial = {
      ...base,
      battle: {
        ...base.battle!,
        light: 4,
        rngCursor: cursor,
        areas: [
          { id: "a", adjacent: ["c", "d"], capacity: 8, elevation: "normal" as const },
          { id: "b", adjacent: ["c", "d"], capacity: 8, elevation: "high" as const },
          { id: "c", adjacent: ["a", "b"], capacity: 8, elevation: "normal" as const },
          { id: "d", adjacent: ["a", "b"], capacity: 8, elevation: "normal" as const },
        ],
      },
    };
    const rolled = applyCommand(initial, {
      type: "playMonsterSkill",
      actorId: "m0",
      targetId: "h1",
      skillSlot: 3,
    });
    expect(entity(rolled.state, "h1").dead).toBe(true);
    expect(entity(rolled.state, "h2").stance).toBe("ranged");
    const waiting = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(waiting.pendingChoice!.options.map((option) => option.id)).toEqual(["c", "d"]);
    expect(waiting.events.some((event) => event.type === "casualtyRemoved")).toBe(false);
    expect(entity(waiting.state, "h2").stance).toBe("ranged");
    const choice = {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "c",
    } as const;
    const done = applyCommand(waiting.state, choice);
    expect(done.events.filter((event) => event.type === "casualtyRemoved")).toHaveLength(1);
    expect(done.events.some((event) => event.type === "monsterCritAreaResolved")).toBe(true);
    expect(entity(done.state, "h1").dead).toBe(true);
    expect(entity(done.state, "h2").stance).toBe("defensive");
    expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor);
    expect(done.events.some((event) => event.type === "heroHealthResolved")).toBe(false);
    expect(applyCommand(done.state, choice).state).toBe(done.state);
    expect(applyCommand(done.state, { type: "resolveShuffles" }).state).toBe(done.state);
  });

  it("怪物选招定位支持带 Life 的英雄，预校验不结算生命或掷死门骰", () => {
    const initial = turn(setup(), "monster", 0);
    const prepared = applyCommand(initial, { type: "prepareMonsterAction", actorId: "m0" });
    expect(prepared.events[0]?.type).toBe("monsterActionPrepared");
    const positioned = applyCommand(prepared.state, { type: "moveMonsterToRange", actorId: "m0" });
    expect(positioned.events[0]?.type).toBe("monsterPositioned");
    expect(entity(positioned.state, "h0").wounds).toBe(entity(initial, "h0").wounds);
    expect(positioned.state.battle!.rngCursor).toBe(prepared.state.battle!.rngCursor);
  });
});
