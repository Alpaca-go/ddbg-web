import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import { nextBattleRoll } from "./encounter";
import { readMonsterAttackView } from "./monster-skill";
import { readPrintedRange } from "./hero-skill";
import type {
  BattleEntity,
  GameState,
  MonsterCardView,
  PlayMonsterSkillCommand,
  SkillSegment,
  SkillStance,
} from "./index";

const cards = (
  JSON.parse(
    readFileSync(
      new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
      "utf8",
    ),
  ) as { cards: MonsterCardView[] }
).cards;
const soldier = cards.find((card) => card.id === "monster_medium:p001")!;
const defender = cards.find((card) => card.id === "monster_medium:p010")!;
const courtier = cards.find((card) => card.id === "monster_medium:p004")!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
function setup(card = soldier, extras: readonly BattleEntity[] = []): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    hero: "CRUSADER",
    skillIds: [],
    areaId: index < 2 ? "a" : "e",
    stance,
    wounds: 1,
    stress: index === 0 ? 5 : 3,
    dodge: 1,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  return createBattleState(1, {
    entities: [
      ...heroes,
      {
        id: "monster",
        side: "monster",
        hero: null,
        skillIds: [],
        areaId: "b",
        stance: card === defender ? "ranged" : "aggressive",
        stanceSlots: 1,
        monsterCardId: card.id,
        wounds: 0,
        life: card.life,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
      ...extras,
    ],
    monsters: [card],
    skills: [],
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b", "e"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "e", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
}
function play(slot = 1): PlayMonsterSkillCommand {
  return { type: "playMonsterSkill", actorId: "monster", targetId: "h0", skillSlot: slot };
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
function monsterTurn(initial: GameState): GameState {
  let state = applyCommand(initial, { type: "startBattle" }).state;
  for (let index = 0; index < 8; index += 1) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    const turn = state.battle!.encounter!.turn;
    if (turn.type === "monster") {
      if (turn.actorId === "monster") return state;
      state = applyCommand(state, { type: "finishMonsterTurn", actorId: turn.actorId }).state;
    } else if (turn.type === "hero") {
      const direction =
        entity(state, turn.actorId).stance === "aggressive" ? "backward" : "forward";
      state = applyCommand(state, { type: "changeStance", actorId: turn.actorId, direction }).state;
      state = applyCommand(state, {
        type: "changeStance",
        actorId: turn.actorId,
        direction: direction === "forward" ? "backward" : "forward",
      }).state;
    } else throw new Error("没有怪物回合");
  }
  throw new Error("先攻没有抽到怪物");
}

describe("完整怪物效果的命令接线（R20–21）", () => {
  const atRange = (card: MonsterCardView, slot: number) => {
    const attack = readMonsterAttackView(card, slot);
    if (attack.status !== "ready") throw new Error(attack.reason);
    const range = readPrintedRange(attack.view);
    if (range.kind !== "exact") throw new Error("缺少射程");
    return patch(setup(card), "monster", { areaId: ["a", "b", "c"][range.distance]! });
  };
  it("单目标及多目标负面状态缺英雄防御栏时，攻击 / RNG / 位移都原子拒绝", () => {
    for (const [id, slot] of [
      ["monster_medium:p034", 1],
      ["monster_medium:p027", 1],
    ] as const) {
      const card = cards.find((c) => c.id === id)!;
      const initial = atRange(card, slot);
      const state = {
        ...initial,
        battle: {
          ...initial.battle!,
          entities: initial.battle!.entities.map((e) =>
            e.side === "hero" ? { ...e, dodge: 20 } : e,
          ),
        },
      };
      const result = applyCommand(state, play(slot));
      expect(result.state).toBe(state);
      expect(result.events[0]).toMatchObject({
        type: "commandRefused",
        message: expect.stringContaining("抗性 / 免疫"),
      });
    }
  });
  it("Cutthroat 自身 Buff 2t 与 Pull 同次保存，不需要英雄目标状态防御", () => {
    const card = cards.find((c) => c.id === "monster_medium:p024")!;
    const state = atRange(card, 3);
    const result = applyCommand(state, play(3));
    expect(result.events[0]?.type, JSON.stringify(result.events)).not.toBe("commandRefused");
    expect(entity(result.state, "monster")).toMatchObject({
      buffStacks: 1,
      statusStacks: [{ kind: "buff", remaining: 2 }],
    });
  });
  it("Acolyte 的压力与降光效果一起结算，共享光照沿命中目标更新", () => {
    const card = cards.find((c) => c.id === "monster_medium:p021")!;
    const result = applyCommand(setup(card), play(1));
    const event = result.events.find(
      (e) => e.type === "monsterSkillResolved" || e.type === "monsterSkillTargetsResolved",
    );
    expect(event).toBeDefined();
    if (event?.type !== "monsterSkillResolved" && event?.type !== "monsterSkillTargetsResolved")
      throw new Error("未结算");
    const resolutions =
      event.type === "monsterSkillResolved" ? [event.resolution] : event.resolutions;
    const hits = resolutions.filter((r) => r.outcome !== "miss");
    expect(result.state.battle!.light).toBe(Math.max(0, 5 - hits.length));
    for (const resolution of hits)
      expect(resolution.targetStress).toBeGreaterThan(
        entity(setup(card), resolution.targetId).stress!,
      );
  });
});
function directionCard(): MonsterCardView {
  // 仅用于路由测试的合成效果，不写入游戏数据或宣称官方卡有此效果。
  const effect: readonly SkillSegment[] = [
    { type: "icon", icon: { key: "target_effects", naming: "confirmed" } },
    { type: "icon", icon: { key: "shuffle", naming: "confirmed" } },
    { type: "text", text: "Push 1 or Pull 1" },
  ];
  const skill = soldier.skills[0]!;
  return {
    ...soldier,
    skills: [{ ...skill, effect_lines: [effect], lines: [...skill.lines, effect] }],
  };
}

describe("已选怪物行动命令（R19–24、R-017、R-020、R-030、R-031）", () => {
  const spearman = cards.find((card) => card.id === "monster_medium:p013")!;
  function multiShuffle(direction: string): MonsterCardView {
    // 只测路由的派生位移行；不把合成效果或数值写入真实怪物卡。
    const effect: readonly SkillSegment[] = [
      { type: "icon", icon: { key: "target_effects", naming: "confirmed" } },
      { type: "icon", icon: { key: "shuffle", naming: "confirmed" } },
      { type: "text", text: direction },
    ];
    return {
      ...spearman,
      skills: spearman.skills.map((s) =>
        s.slot !== 2 ? s : { ...s, lines: [...s.lines, effect], effect_lines: [effect] },
      ),
    };
  }
  it("怪物多目标位移后，被选与未选英雄暴击压力分别结算且同区只加一次", () => {
    let state = setup(multiShuffle("Push 1"));
    while (nextBattleRoll(state.seed, 0) !== 1) state = { ...state, seed: state.seed + 1 };
    const played = applyCommand(state, play(2));
    expect(played.state.battle!.shuffleIntents.map((i) => i.entityId)).toEqual(["h0", "h1"]);
    const moved = applyCommand(played.state, { type: "resolveShuffles" });
    for (const id of ["h0", "h1"]) expect(entity(moved.state, id).areaId).toBe("e");
    expect(entity(moved.state, "h0").stress).toBe(6);
    for (const id of ["h1", "h2", "h3"]) expect(entity(moved.state, id).stress).toBe(4);
    expect(moved.state.battle!.rngCursor).toBe(1);
    expect(moved.events.filter((e) => e.type === "monsterCritAreaResolved")).toHaveLength(1);
    expect(moved.events.filter((e) => e.type === "shuffleResolved")).toHaveLength(2);
  });

  it("多目标方向由每个英雄分别选择，选择完成前不掷骰；续接不重复伤害", () => {
    const initial = setup(multiShuffle("Push 1 or Pull 1"));
    const first = applyCommand(initial, play(2));
    expect(first.pendingChoice?.actorId).toBe("h0");
    expect(first.state.battle!.rngCursor).toBe(0);
    const second = applyCommand(first.state, {
      type: "resolveChoice",
      choiceId: first.pendingChoice!.id,
      optionId: "push",
    });
    expect(second.pendingChoice?.actorId).toBe("h1");
    expect(second.state.battle!.rngCursor).toBe(0);
    expect(applyCommand(second.state, { type: "drawInitiative" }).state).toBe(second.state);
    const played = applyCommand(second.state, {
      type: "resolveChoice",
      choiceId: second.pendingChoice!.id,
      optionId: "pull",
    });
    expect(played.state.battle!.rngCursor).toBe(1);
    const moved = applyCommand(played.state, { type: "resolveShuffles" });
    expect(entity(moved.state, "h0").areaId).toBe("e");
    expect(entity(moved.state, "h1").areaId).toBe("b");
    expect(entity(moved.state, "h0").wounds).toBe(entity(played.state, "h0").wounds);
    expect(moved.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(moved.state, { type: "resolveShuffles" }).state).toBe(moved.state);
  });
  it("怪物多目标落点分岔分别交给被位移英雄，选择后只结束一次回合", () => {
    let state = monsterTurn(setup(multiShuffle("Push 1")));
    while (nextBattleRoll(state.seed, state.battle!.rngCursor) !== 7)
      state = { ...state, seed: state.seed + 1 };
    state = {
      ...state,
      battle: {
        ...state.battle!,
        areas: [
          ...state.battle!.areas.map((a) =>
            a.id === "a" ? { ...a, adjacent: [...a.adjacent, "f"] } : a,
          ),
          { id: "f", elevation: "normal", adjacent: ["a"], capacity: 8 },
        ],
      },
    };
    const played = applyCommand(state, play(2));
    const first = applyCommand(played.state, { type: "resolveShuffles" });
    expect(first.pendingChoice?.actorId).toBe("h0");
    expect(first.pendingChoice?.options.map((o) => o.id)).toEqual(["e", "f"]);
    const second = applyCommand(first.state, {
      type: "resolveChoice",
      choiceId: first.pendingChoice!.id,
      optionId: "e",
    });
    expect(second.pendingChoice?.actorId).toBe("h1");
    expect(second.state.battle!.rngCursor).toBe(played.state.battle!.rngCursor);
    const completed = applyCommand(second.state, {
      type: "resolveChoice",
      choiceId: second.pendingChoice!.id,
      optionId: "f",
    });
    expect(entity(completed.state, "h0").areaId).toBe("e");
    expect(entity(completed.state, "h1").areaId).toBe("f");
    expect(completed.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    expect(completed.state.battle!.rngCursor).toBe(played.state.battle!.rngCursor);
    expect(
      applyCommand(completed.state, {
        type: "resolveChoice",
        choiceId: first.pendingChoice!.id,
        optionId: "f",
      }).state,
    ).toBe(completed.state);
  });
  it("多目标暴击逐英雄进入死门，后续受伤各掷自己的死门骰", () => {
    const stats = (
      JSON.parse(
        readFileSync(
          new URL("../../data/normalized/corebox/hero_stat.json", import.meta.url),
          "utf8",
        ),
      ) as {
        cards: {
          id: string;
          name: string;
          life: number;
          attributesVerified: boolean;
          level: number;
        }[];
      }
    ).cards.filter((s) => s.attributesVerified && s.level === 1);
    const initial = setup(spearman);
    let seed = 0;
    while (nextBattleRoll(seed, 0) !== 1 || nextBattleRoll(seed, 1) > 8) seed += 1;
    const state = createBattleState(seed, {
      ...initial.battle!,
      heroStats: stats,
      entities: initial.battle!.entities.map((e, index) =>
        e.side === "monster"
          ? e
          : {
              ...e,
              hero: stats[index]!.name,
              heroStatId: stats[index]!.id,
              life: stats[index]!.life,
              areaId: "a",
              wounds: stats[index]!.life - 1,
            },
      ),
    });
    const hit = applyCommand(state, play(2));
    expect(hit.state.battle!.rngCursor).toBe(1);
    expect(hit.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(4);
    for (const e of hit.state.battle!.entities.filter((e) => e.side === "hero")) {
      expect(e.wounds).toBe(e.life);
      expect(e.dead).toBe(false);
      expect(e.stress).toBe(entity(state, e.id).stress! + 1);
    }
    const repeated = applyCommand(hit.state, play(2));
    expect(repeated.state.battle!.rngCursor).toBe(6);
    expect(repeated.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(4);
    expect(applyCommand(hit.state, play(2))).toEqual(repeated);
  });
  it("Bone Spearman Impale：同区四英雄按姿态结算，共用一次技能骰并可确定性回放", () => {
    let initial = setup(spearman);
    for (const id of ["h2", "h3"]) initial = patch(initial, id, { areaId: "a" });
    initial = patch(initial, "h1", { dodge: 10 });
    const command = { ...play(2), targetId: "h3" };
    const before = structuredClone(initial);
    const result = applyCommand(initial, command);
    const event = result.events.find((e) => e.type === "monsterSkillTargetsResolved")!;
    expect(event.resolutions.map((r) => r.targetId)).toEqual(["h0", "h1", "h2", "h3"]);
    expect(event.resolutions[1]!.outcome).toBe("miss");
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(entity(result.state, "h1").wounds).toBe(1);
    expect(initial).toEqual(before);
    expect(applyCommand(before, command)).toEqual(result);
  });

  it("Crowded 按人数选区，人数平手按姿态；存活 Guard 优先选区", () => {
    const initial = monsterTurn(setup(spearman));
    // 夹具固定 Impale 选招，保留真实卡牌的攻击数值 / 目标图标。
    const card = { ...spearman, stanceGroups: [{ stances, skill: 2 }] };
    const state = { ...initial, battle: { ...initial.battle!, monsters: [card] } };
    expect(
      applyCommand(state, { type: "prepareMonsterAction", actorId: "monster" }).state.battle!
        .monsterAction?.targetId,
    ).toBe("h0");
    const guarded = patch(state, "h3", { guard: true });
    expect(
      applyCommand(guarded, { type: "prepareMonsterAction", actorId: "monster" }).state.battle!
        .monsterAction?.targetId,
    ).toBe("h3");
    const crowded = patch(state, "h1", { areaId: "e" });
    expect(
      applyCommand(crowded, { type: "prepareMonsterAction", actorId: "monster" }).state.battle!
        .monsterAction?.targetId,
    ).toBe("h1");
  });

  it("多目标先定位再攻击，整次只结束一次怪物回合", () => {
    const card = { ...spearman, stanceGroups: [{ stances, skill: 2 }] };
    const initial = monsterTurn(setup(card));
    const chosen = applyCommand(initial, { type: "prepareMonsterAction", actorId: "monster" });
    const positioned = applyCommand(chosen.state, {
      type: "moveMonsterToRange",
      actorId: "monster",
    });
    expect(positioned.events[0]?.type).toBe("monsterPositioned");
    const result = applyCommand(positioned.state, play(2));
    expect(result.events.filter((e) => e.type === "monsterSkillTargetsResolved")).toHaveLength(1);
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    expect(result.state.battle!.rngCursor).toBe(positioned.state.battle!.rngCursor + 1);
    expect(result.state.battle!.monsterAction).toBeNull();
  });

  it("多个英雄的反击累计杀死怪物，一次补位 / 胜利；落空不反弹", () => {
    let state = patch(setup(spearman), "h0", { riposte: true, protection: true });
    state = patch(state, "h1", { riposte: true });
    state = patch(state, "monster", { wounds: spearman.life - 5 });
    const started = monsterTurn(setup(spearman));
    let seed = 0;
    while (nextBattleRoll(seed, started.battle!.rngCursor) !== 7) seed += 1;
    const encounter = {
      ...state,
      seed,
      battle: {
        ...state.battle!,
        encounter: started.battle!.encounter!,
        rngCursor: started.battle!.rngCursor,
      },
    };
    const result = applyCommand(encounter, play(2));
    const event = result.events.find((e) => e.type === "monsterSkillTargetsResolved")!;
    const reflected = event.resolutions.reduce((sum, r) => sum + (r.riposteDamage ?? 0), 0);
    expect(entity(result.state, "monster").wounds).toBe(
      entity(encounter, "monster").wounds + reflected,
    );
    expect(event.actorDead).toBe(true);
    expect(result.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
    const miss = applyCommand(patch(state, "h1", { dodge: 20 }), play(2));
    expect(miss.events[0]).toMatchObject({
      resolutions: [{ riposteDamage: 3 }, { outcome: "miss", riposteDamage: null }],
    });
    expect(entity(miss.state, "monster").wounds).toBe(entity(state, "monster").wounds + 3);
    expect(applyCommand(encounter, play(2))).toEqual(result);
  });

  it("多目标缺值 / 未支持效果在掷骰前原子拒绝", () => {
    for (const state of [
      setup({ ...spearman, verification: { unverified: true } }),
      setup(cards.find((c) => c.id === "monster_medium:p027")!),
    ]) {
      const result = applyCommand(
        state,
        play(state.battle!.monsters![0]!.id === "monster_medium:p027" ? 1 : 2),
      );
      expect(result.state).toBe(state);
      expect(result.events[0]?.type).toBe("commandRefused");
    }
  });
  it("真实 Bone Soldier 命中伤口写回，共享 RNG，回放一致且不改入参", () => {
    const initial = setup();
    const copy = structuredClone(initial);
    const first = applyCommand(initial, play());
    expect(first.events[0]).toMatchObject({
      type: "monsterSkillResolved",
      roll: 7,
      resolution: { outcome: "hit", damageDealt: 5 },
    });
    expect(entity(first.state, "h0").wounds).toBe(6);
    expect(first.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(first.state, play()).events[0]).toMatchObject({
      roll: 1,
      resolution: { outcome: "crit" },
    });
    const replay = () =>
      [play(), play()].reduce((state, command) => applyCommand(state, command).state, initial);
    expect(replay()).toEqual(replay());
    expect(initial).toEqual(copy);
  });

  it("遭遇战只允许当前怪物，命中或落空都结束一次回合，不能重复攻击", () => {
    const waiting = applyCommand(setup(), play()).state;
    expect(waiting.battle!.encounter).toBeUndefined();
    const started = applyCommand(setup(), { type: "startBattle" }).state;
    expect(applyCommand(started, play()).state).toBe(started);
    const turn = patch(monsterTurn(setup()), "h0", { dodge: 100 });
    const result = applyCommand(turn, play());
    expect(result.events[0]).toMatchObject({ resolution: { outcome: "miss" } });
    expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(applyCommand(result.state, play()).state).toBe(result.state);
    expect(
      applyCommand(result.state, { type: "finishMonsterTurn", actorId: "monster" }).state,
    ).toBe(result.state);
  });

  it("暴击与低光照压力写回受击者和同区未选英雄，怪物不获得减压", () => {
    const initial = setup();
    const result = applyCommand(
      { ...initial, battle: { ...initial.battle!, light: 2, rngCursor: 1 } },
      play(),
    );
    expect(result.events[0]).toMatchObject({
      roll: 1,
      resolution: { outcome: "crit", actorStress: null },
    });
    expect(entity(result.state, "h0").stress).toBe(7);
    expect(entity(result.state, "h1").stress).toBe(5);
    expect(entity(result.state, "h2").stress).toBe(3);
    expect(entity(result.state, "monster").stress).toBeUndefined();
  });

  it("R22 自身 Pull 1 即使落空也移动，位移结束后才续接怪物回合", () => {
    const turn = patch(monsterTurn(setup(defender)), "h0", { dodge: 100 });
    const rolled = applyCommand(turn, play(3));
    expect(rolled.events[0]).toMatchObject({
      resolution: { outcome: "miss", actorShuffle: { direction: "pull", distance: 1 } },
    });
    expect(rolled.state.battle!.encounter!.turn.type).toBe("monster");
    expect(
      applyCommand(rolled.state, { type: "finishMonsterTurn", actorId: "monster" }).state,
    ).toBe(rolled.state);
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(entity(done.state, "monster")).toMatchObject({ areaId: "a", stance: "defensive" });
    expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor);
    expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it("怪物自身位移照常扣抗性一次，不采用英雄可忽略自身抗性的例外", () => {
    const initial = patch(setup(defender), "monster", { shuffleResist: true });
    const rolled = applyCommand(initial, play(3));
    expect(rolled.events[0]).toMatchObject({
      resolution: { actorShuffle: { direction: "pull", distance: 0 } },
    });
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(entity(done.state, "monster")).toMatchObject({ areaId: "b", stance: "ranged" });
    expect(done.state.battle!.shuffleIntents).toEqual([]);
  });

  it("反弹杀死攻击怪物，补位只改姿态；最后一只死亡时胜利", () => {
    const base = setup();
    const other = { ...entity(base, "monster"), id: "other", stance: "defensive" as const };
    const turn = patch(
      patch(monsterTurn(setup(soldier, [other])), "monster", { wounds: soldier.life - 1 }),
      "h0",
      { riposte: true },
    );
    const result = applyCommand(turn, play());
    expect(entity(result.state, "monster").dead).toBe(true);
    expect(entity(result.state, "other")).toMatchObject({ stance: "aggressive", areaId: "b" });
    const last = patch(patch(monsterTurn(setup()), "monster", { wounds: soldier.life - 1 }), "h0", {
      riposte: true,
    });
    const hit = { ...last, battle: { ...last.battle!, rngCursor: 1 } };
    expect(applyCommand(hit, play()).state.battle!.encounter!.turn).toEqual({
      type: "finished",
      outcome: "victory",
    });
  });

  it("自身位移先于反弹死亡；位移后不会复活，随后结束战斗", () => {
    const turn = patch(
      patch(monsterTurn(setup(defender)), "monster", { wounds: defender.life - 1 }),
      "h0",
      { riposte: true, dodge: 0 },
    );
    const prepared = { ...turn, battle: { ...turn.battle!, rngCursor: 1 } };
    const rolled = applyCommand(prepared, play(3));
    expect(entity(rolled.state, "monster").dead).toBe(true);
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(done.events[0]).toMatchObject({ type: "shuffleResolved", path: ["a"] });
    expect(entity(done.state, "monster")).toMatchObject({
      dead: true,
      areaId: "a",
      stance: "defensive",
    });
    expect(done.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
  });

  it("方向与落点选择交给受击英雄；分岔冻结命令且不重新掷骰", () => {
    const initial = setup(directionCard());
    const direction = applyCommand(initial, play());
    expect(direction.pendingChoice).toMatchObject({
      actorId: "h0",
      options: [{ id: "push" }, { id: "pull" }],
    });
    expect(direction.state.battle!.rngCursor).toBe(0);
    const rolled = applyCommand(direction.state, {
      type: "resolveChoice",
      choiceId: direction.pendingChoice!.id,
      optionId: "push",
    });
    // 从怪物 b 推开 a 中的英雄，可到 e；增加一个对称分岔以验证选择归属。
    const withBranch = {
      ...rolled.state,
      battle: {
        ...rolled.state.battle!,
        areas: [
          ...rolled.state.battle!.areas.map((area) =>
            area.id === "a" ? { ...area, adjacent: [...area.adjacent, "f"] } : area,
          ),
          { id: "f", elevation: "normal" as const, adjacent: ["a"], capacity: 8 },
        ],
      },
    };
    const waiting = applyCommand(withBranch, { type: "resolveShuffles" });
    expect(waiting.pendingChoice).toMatchObject({
      actorId: "h0",
      options: [{ id: "e" }, { id: "f" }],
    });
    expect(applyCommand(waiting.state, play()).state).toBe(waiting.state);
    const done = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "f",
    });
    expect(entity(done.state, "h0")).toMatchObject({ areaId: "f", stance: "defensive" });
    expect(done.state.battle!.rngCursor).toBe(1);
  });

  it("怪物暴击位移后按受击者最终区域加压，旧同区名单不重复生效", () => {
    const initial = setup(directionCard());
    const prepared = { ...initial, battle: { ...initial.battle!, rngCursor: 1 } };
    const rolled = applyCommand(prepared, { ...play(), shuffleChoice: "push" });
    expect(rolled.events[0]).toMatchObject({ resolution: { outcome: "crit" } });
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(entity(done.state, "h0")).toMatchObject({ areaId: "e", stress: 6 });
    expect(entity(done.state, "h1").stress).toBe(3);
    expect(entity(done.state, "h2").stress).toBe(4);
    expect(entity(done.state, "h3").stress).toBe(4);
    expect(done.events.filter((event) => event.type === "monsterCritAreaResolved")).toHaveLength(1);
    expect(done.state.battle!.rngCursor).toBe(2);
  });

  it("拒绝未知关联、Life 不一致、未核实技能、Guard 与射程；不消耗 RNG", () => {
    const initial = setup();
    const unverified = {
      ...initial,
      battle: {
        ...initial.battle!,
        monsters: [{ ...soldier, verification: { unverified: true } }],
      },
    };
    for (const state of [
      patch(initial, "monster", { monsterCardId: "unknown" }),
      patch(initial, "monster", { life: 999 }),
      patch(initial, "h1", { guard: true }),
      patch(initial, "h0", { areaId: "e" }),
      unverified,
    ]) {
      const result = applyCommand(state, play());
      expect(result.events[0]?.type).toBe("commandRefused");
      expect(result.state).toBe(state);
    }
    expect(applyCommand(initial, play(4)).state).toBe(initial);
    expect(applyCommand(initial, { ...play(), targetId: "monster" }).state).toBe(initial);
    expect(() =>
      createBattleState(1, {
        ...initial.battle!,
        entities: initial.battle!.entities.map((entry) =>
          entry.id === "monster" ? { ...entry, life: 999 } : entry,
        ),
      }),
    ).toThrow();
  });

  it.each([false, true])("怪物暴击续接保留英雄生命结果（dead=%s），压力仅修正一次", (dead) => {
    const initial = patch(patch(setup(defender), "h0", { stress: 9 }), "h1", { stress: 9 });
    const prepared = { ...initial, battle: { ...initial.battle!, light: 2, rngCursor: 1 } };
    const rolled = applyCommand(prepared, play(3));
    expect(rolled.events[0]).toMatchObject({ roll: 1, resolution: { outcome: "crit" } });
    // 合成生命应用结果，隔离测试压力续接；不是新的卡牌 Life 数据。
    const applied = patch(patch(rolled.state, "h0", { life: 2, wounds: 2, dead }), "monster", {
      wounds: 1,
      bleed: ["preserved-bleed"],
      blight: ["preserved-blight"],
    });
    const before = structuredClone(applied);
    const done = applyCommand(applied, { type: "resolveShuffles" });
    expect(entity(done.state, "h0")).toMatchObject({ life: 2, wounds: 2, dead, stress: 10 });
    expect(entity(done.state, "h1").stress).toBe(10);
    expect(entity(done.state, "monster")).toMatchObject({
      wounds: 1,
      dead: false,
      areaId: "a",
      stance: "defensive",
      bleed: ["preserved-bleed"],
      blight: ["preserved-blight"],
    });
    expect(entity(done.state, "monster").stress).toBeUndefined();
    expect(done.events.filter((event) => event.type === "monsterCritAreaResolved")).toHaveLength(1);
    expect(done.events.filter((event) => event.type === "monsterSkillResolved")).toHaveLength(0);
    expect(done.state.battle!.rngCursor).toBe(applied.battle!.rngCursor);
    expect(applied).toEqual(before);
    expect(applyCommand(applied, { type: "resolveShuffles" })).toEqual(done);
    expect(applyCommand(done.state, { type: "resolveShuffles" }).state).toBe(done.state);
  });
});

// 合成分组只测试接线路由；不是 Soldier / 方向夹具的实际卡面转录。
function eligible(card = soldier, roll = false): MonsterCardView {
  return {
    ...card,
    stanceGroups: [
      {
        stances: [...stances],
        ...(roll ? { rollTable: [{ min: 1, max: 10, skill: 1 }] } : { skill: 1 }),
      },
    ],
  };
}
const prepare = { type: "prepareMonsterAction", actorId: "monster" } as const;

describe("怪物选招与目标命令接线（R-015、R-024）", () => {
  it("真实 Courtier 压力 +1 达到 10，公共命令只触发一次意志检定并结束回合", () => {
    let seed = 0;
    while (nextBattleRoll(seed, 0) !== 4) seed++;
    const placed = patch(
      patch(setup(courtier), "monster", { stance: "ranged", areaId: "c" }),
      "h0",
      { stress: 9 },
    );
    const initial: GameState = {
      ...placed,
      seed,
      battle: {
        ...placed.battle!,
        resolveCards: JSON.parse(
          readFileSync(
            new URL("../../data/normalized/corebox/virtue_affliction.json", import.meta.url),
            "utf8",
          ),
        ).cards,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "monster" },
        },
      },
    };
    const chosen = applyCommand(initial, prepare);
    expect(chosen.state.battle!.monsterAction).toMatchObject({
      skillSlot: 1,
      targetId: "h0",
      selectionRoll: null,
    });
    const positioned = applyCommand(chosen.state, {
      type: "moveMonsterToRange",
      actorId: "monster",
    });
    const done = applyCommand(positioned.state, play());
    expect(done).toEqual(applyCommand(positioned.state, play()));
    expect(entity(done.state, "h0")).toMatchObject({ wounds: 4, stress: 0, resolveTested: true });
    expect(entity(done.state, "h0").resolveCardId).toBeTruthy();
    expect(done.state.battle!.rngCursor).toBe(6);
    expect(done.events.filter((event) => event.type === "resolveTested")).toHaveLength(1);
    expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(done.state.battle!.encounter!.actedIds).toEqual(["monster"]);
  });
  it("固定技能不掷选招骰，按真实 Most Wounded 选目标，不消耗回合", () => {
    const initial = patch(monsterTurn(setup(eligible())), "h1", { wounds: 4 });
    const before = structuredClone(initial);
    const result = applyCommand(initial, prepare);
    expect(result.events).toEqual([
      {
        type: "monsterActionPrepared",
        message: "已按姿态选招并确定英雄目标",
        actorId: "monster",
        skillSlot: 1,
        targetId: "h1",
        selectionRoll: null,
        skillId: `${soldier.id}:skill1`,
        targetPriority: "Most Wounded",
      },
    ]);
    expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(result.state.battle!.encounter).toEqual(initial.battle!.encounter);
    expect(initial).toEqual(before);
    expect(applyCommand(result.state, play()).state).toBe(result.state);
    expect(applyCommand(result.state, { ...play(), targetId: "h1" }).events[0]?.type).toBe(
      "monsterSkillResolved",
    );
  });

  it("选招与攻击使用共享 RNG；重复选招拒绝，完整命令回放一致", () => {
    const initial = monsterTurn(setup(eligible(soldier, true)));
    const chosen = applyCommand(initial, prepare);
    expect(chosen.events[0]).toMatchObject({
      type: "monsterActionPrepared",
      skillSlot: 1,
      targetId: "h0",
    });
    expect(chosen.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
    expect(chosen.state.battle!.monsterAction!.selectionRoll).toBeGreaterThanOrEqual(1);
    expect(chosen.events[0]).toMatchObject({
      skillId: `${soldier.id}:skill1`,
      targetPriority: "Most Wounded",
      selectionRoll: nextBattleRoll(initial.seed, initial.battle!.rngCursor),
    });
    expect(applyCommand(chosen.state, prepare).state).toBe(chosen.state);
    const fired = applyCommand(chosen.state, play());
    expect(fired.events[0]?.type).toBe("monsterSkillResolved");
    expect(fired.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 2);
    expect(fired.state.battle!.monsterAction).toBeNull();
    expect(fired.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(applyCommand(applyCommand(initial, prepare).state, play())).toEqual(fired);
  });

  it("R22 Defender 远程固定技能 3，Furthest 平手按姿态选 h2", () => {
    const card: MonsterCardView = {
      ...defender,
      stanceGroups: [
        {
          stances: ["aggressive", "defensive"],
          rollTable: [
            { min: 1, max: 5, skill: 2 },
            { min: 6, max: 10, skill: 1 },
          ],
        },
        { stances: ["ranged", "support"], skill: 3 },
      ],
    };
    const initial = monsterTurn(patch(setup(card), "monster", { stance: "ranged" }));
    const result = applyCommand(initial, prepare);
    expect(result.state.battle!.monsterAction).toEqual({
      actorId: "monster",
      skillSlot: 3,
      targetId: "h2",
      selectionRoll: null,
    });
    expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(applyCommand(result.state, { ...play(1), targetId: "h2" }).state).toBe(result.state);
  });

  it("大型怪使用较高优先级姿态；Guard 覆盖技能目标优先级", () => {
    const initial = patch(
      patch(monsterTurn(setup(eligible())), "monster", { stanceSlots: 2 }),
      "h3",
      { guard: true },
    );
    const result = applyCommand(initial, prepare);
    expect(result.state.battle!.monsterAction).toMatchObject({ skillSlot: 1, targetId: "h3" });
    expect(result.events[0]).toMatchObject({
      targetPriority: "Most Wounded",
      targetId: "h3",
    });
  });

  it("方向 / 区域选择保存选招结果，不重掷选招骰或绕过目标约束", () => {
    const initial = monsterTurn(setup(eligible(directionCard(), true)));
    const chosen = applyCommand(initial, prepare);
    const waiting = applyCommand(chosen.state, play());
    expect(waiting.pendingChoice?.actorId).toBe("h0");
    expect(waiting.state.battle!.monsterAction).toEqual(chosen.state.battle!.monsterAction);
    expect(waiting.state.battle!.rngCursor).toBe(chosen.state.battle!.rngCursor);
    expect(applyCommand(waiting.state, prepare).state).toBe(waiting.state);
    const rolled = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "push",
    });
    expect(rolled.state.battle!.rngCursor).toBe(chosen.state.battle!.rngCursor + 1);
    expect(rolled.state.battle!.monsterAction).toBeNull();
    expect(applyCommand(rolled.state, prepare).state).toBe(rolled.state);
    const completed = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(completed.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(completed.state.battle!.monsterAction).toBeNull();
  });

  it("选定 Guard 够不到时保存原选招；攻击拒绝不换人、不重掷", () => {
    const initial = patch(monsterTurn(setup(eligible(soldier, true))), "h3", { guard: true });
    const chosen = applyCommand(initial, prepare);
    expect(chosen.state.battle!.monsterAction?.targetId).toBe("h3");
    expect(applyCommand(chosen.state, { ...play(), targetId: "h3" }).state).toBe(chosen.state);
    expect(applyCommand(chosen.state, play()).state).toBe(chosen.state);
    expect(applyCommand(chosen.state, prepare).state).toBe(chosen.state);
    const skipped = applyCommand(chosen.state, { type: "finishMonsterTurn", actorId: "monster" });
    expect(skipped.state.battle!.monsterAction).toBeNull();
    expect(skipped.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it("未开始 / 非当前回合、缺少分组或未核实目标均拒绝且不消耗 RNG", () => {
    const missingGroups = { ...soldier };
    delete missingGroups.stanceGroups;
    const noGroups = monsterTurn(setup(missingGroups));
    const card = eligible(soldier, true);
    const unsupported = {
      ...card,
      skills: card.skills.map((skill) => ({ ...skill, target: "Unknown priority" })),
    };
    for (const initial of [
      setup(card),
      applyCommand(setup(card), { type: "startBattle" }).state,
      noGroups,
      monsterTurn(setup(unsupported)),
    ]) {
      const result = applyCommand(initial, prepare);
      expect(result.state).toBe(initial);
      expect(result.events[0]?.type).toBe("commandRefused");
    }
    expect(applyCommand(noGroups, { ...prepare, actorId: "h0" }).state).toBe(noGroups);
  });
});
