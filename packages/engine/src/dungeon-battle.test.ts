import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import rooms from "../../data/normalized/corebox/room.json";
import pool from "../../data/normalized/corebox/monster_pool.json";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import skillsFile from "../../data/normalized/corebox/hero_skill.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import monsterFile from "../../data/normalized/corebox/monster_medium.json";
import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import largeMonsters from "../../data/normalized/corebox/monster_large.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { createConditionPool, gainDisease, conditionPoolProblem } from "./conditions";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import {
  normalizedHeroSkillFileSchema,
  normalizedVirtueAfflictionFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedQuirkFileSchema,
  normalizedMonsterLargeFileSchema,
} from "../../data/src/normalize/schema";
import { roomFileSchema } from "../../data/src/room";
import { monsterPoolFileSchema } from "../../data/src/monster-pool";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonBattleCatalog } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { closeBattleLoot } from "./loot";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { resolveMonsterSkill } from "./monster-skill";
import { readMonsterAttackView } from "./monster-skill";
import { readPrintedRange } from "./hero-skill";
import { skillTargetView } from "./battle";
import { tickStatusStacks } from "./status";

const stats = normalizedHeroStatFileSchema.parse(statsFile).cards.filter((s) => s.level === 1);
const skills = normalizedHeroSkillFileSchema.parse(skillsFile).cards;
const catalog = JSON.parse(
  JSON.stringify({
    heroStats: stats,
    skills,
    conditions: createConditionPool(
      diseaseFileSchema.parse(diseases).cards,
      normalizedQuirkFileSchema.parse(quirks).cards,
    ),
    monsters: [
      ...normalizedMonsterMediumFileSchema.parse(monsterFile).cards,
      ...normalizedMonsterLargeFileSchema.parse(largeMonsters).cards,
    ]
      .filter((c) => "skills" in c)
      .map((c) => ({
        ...c,
        dodge: c.header_unlabeled_numbers.find(
          (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
        )?.numeric,
      })),
  }),
) as DungeonBattleCatalog;
function setup(seed: number): GameState {
  const heroes = stats.map((s, i) => ({
    id: `hero-${i}`,
    heroStatId: s.id,
    level: 1,
    life: s.life,
    wounds: 1,
    stress: 1,
    attributesVerified: true,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    skillIds: skills
      .filter((c) => c.hero === s.name && c.level === 1)
      .slice(0, 3)
      .map((c) => c.id),
  }));
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "radiant",
    "D",
    heroes,
    JSON.parse(JSON.stringify(normalizedVirtueAfflictionFileSchema.parse(resolveFile).cards)),
    { dungeonLevel: 1, light: 5, provisions: [{ id: "food", face: "food" }] },
    undefined,
    roomFileSchema.parse(rooms).cards,
    monsterPoolFileSchema.parse(pool).cards,
    catalog,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "treasure" } : r)),
    },
  };
}
function deploy(seed: number): GameState {
  const s = applyCommand(setup(seed), { type: "prepareDungeonBattle" }).state;
  return applyCommand(s, { type: "prepareDungeonMonsters" }).state;
}
// 不过滤生产牌池；寻找一条天然抽到获批六种的固定种子，仅作测试。
const goodSeed = 1885;
function started() {
  return applyCommand(deploy(goodSeed), { type: "startDungeonBattle" }).state;
}

it("完整 42 张池自然抽到 Maggot 可正式入场；疾病实体与 RNG 一次回传地图", () => {
  let entered: GameState | undefined;
  for (let seed = 1; seed <= 400; seed++) {
    const candidate = deploy(seed);
    if (
      !candidate.dungeon!.monsterPool?.active?.monsters.some(
        (m) => m.cardId === "monster_medium:p031",
      )
    )
      continue;
    const result = applyCommand(candidate, { type: "startDungeonBattle" });
    if (result.state.battle) {
      entered = result.state;
      break;
    }
  }
  expect(entered, "完整牌池自然抽取，不过滤或替换 Maggot").toBeDefined();
  const state = applyCommand(entered!, { type: "startBattle" }).state,
    b = state.battle!;
  expect(b.monsters!.some((m) => m.id === "monster_medium:p031")).toBe(true);
  const acquired = gainDisease(
    b.conditions!,
    b.entities.filter((h) => h.side === "hero"),
    "hero-0",
    state.seed,
    b.rngCursor,
  );
  if (acquired.status !== "resolved") throw new Error(acquired.reason);
  // 战斗终局本身沿用既有四轮场景；这里单独验证感染状态的终局交接边界。
  const terminal: GameState = {
    ...state,
    battle: {
      ...b,
      conditions: acquired.pool,
      rngCursor: acquired.cursor,
      entities: b.entities.map((h) => acquired.heroes.find((e) => e.id === h.id) ?? h),
      loot: closeBattleLoot(b.loot),
      encounter: {
        round: 4,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "retreat" },
      },
    },
  };
  const result = applyCommand(terminal, { type: "finishDungeonBattle" });
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  expect(result.state.dungeon!.heroes[0]!.diseaseId).toBe(acquired.diseaseId);
  expect(result.state.dungeon!.conditions).toEqual(acquired.pool);
  expect(
    conditionPoolProblem(result.state.dungeon!.conditions!, result.state.dungeon!.heroes),
  ).toBeNull();
  expect(result.state.dungeon!.cursor).toBe(acquired.cursor + 41);
  expect(applyCommand(result.state, { type: "finishDungeonBattle" }).state).toBe(result.state);
}, 15_000);
function send(s: GameState, command: Command) {
  const result = applyCommand(s, command);
  expect(
    result.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(command),
  ).toBeUndefined();
  return result.state;
}
it("真实部署交接保留 RNG、伤口压力装备；地牢命令冻结，获批负面状态怪物不重抽", () => {
  const before = deploy(goodSeed),
    copy = structuredClone(before),
    s = started();
  expect(s.battle).toBeDefined();
  expect(before).toEqual(copy);
  expect(s.battle!.rngCursor).toBe(before.dungeon!.cursor);
  expect(
    s
      .battle!.entities.filter((e) => e.side === "hero")
      .map((e) => [e.wounds, e.stress, e.skillIds.length]),
  ).toEqual(Array(4).fill([1, 1, 3]));
  expect(s.battle!.entities.filter((e) => e.side === "monster").map((e) => e.id)).toEqual(
    before.dungeon!.monsterPool!.active!.monsters.map((m) => m.instanceId),
  );
  for (const type of [
    "startDungeonBattle",
    "scoutDungeon",
    "prepareDungeonBattle",
    "finishDungeonBattle",
  ] as const)
    expect(applyCommand(s, { type }).state).toBe(s);
  const deployment = deploy(11);
  const admitted = send(deployment, { type: "startDungeonBattle" });
  expect(admitted.battle).toBeDefined();
  expect(admitted.battle!.rngCursor).toBe(deployment.dungeon!.cursor);
  expect(admitted.battle!.entities.filter((e) => e.side === "monster").map((e) => e.id)).toEqual(
    deployment.dungeon!.monsterPool!.active!.monsters.map((m) => m.instanceId),
  );
});
it("房间 / 板块身份漂移或活动地图房间过期时不进入战斗、不重抽或推进RNG", () => {
  const original = deploy(11),
    d = original.dungeon!,
    pool = d.roomCards!;
  for (const active of [
    { ...pool.active!, cardId: "room:p002" },
    { ...pool.active!, tileId: "room_tile:p002:back" },
    { ...pool.active!, roomId: "G" },
  ]) {
    const state = { ...original, dungeon: { ...d, roomCards: { ...pool, active } } };
    const before = structuredClone(state);
    const result = applyCommand(state, { type: "startDungeonBattle" });
    expect(result.state).toBe(state);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(state).toEqual(before);
    expect(result.state.battle).toBeUndefined();
    expect(result.state.dungeon!.cursor).toBe(d.cursor);
  }
});

function terminal(outcome: "victory" | "retreat") {
  const s = send(started(), { type: "startBattle" });
  return {
    ...s,
    battle: {
      ...s.battle!,
      loot: closeBattleLoot(s.battle!.loot),
      encounter: {
        ...s.battle!.encounter!,
        round: 4,
        deck: [],
        turn: { type: "finished" as const, outcome },
      },
    },
  };
}

it("获批 Stun / Bleed 只减 Nt，不减面值；其余状态不阻挡，堆叠与回合消费正确", () => {
  const s = send(deploy(11), { type: "startDungeonBattle" });
  const b = s.battle!,
    actor = b.entities.find((e) => e.side === "monster")!;
  const before = structuredClone(b);
  for (const [name, page, slot, expected] of [
    [
      "CRUSADER",
      "monster_medium:p034",
      1,
      [
        { kind: "debuff", remaining: 2 },
        { kind: "stun", remaining: 1 },
        { kind: "mark", remaining: 3 },
      ],
    ],
    [
      "HELLION",
      "monster_medium:p034",
      1,
      [
        { kind: "debuff", remaining: 2 },
        { kind: "stun", remaining: 2 },
        { kind: "mark", remaining: 3 },
      ],
    ],
    [
      "HELLION",
      "monster_medium:p018",
      1,
      [
        { kind: "bleed", remaining: 2, amount: 1 },
        { kind: "debuff", remaining: 2 },
      ],
    ],
    [
      "CRUSADER",
      "monster_medium:p018",
      1,
      [
        { kind: "bleed", remaining: 3, amount: 1 },
        { kind: "debuff", remaining: 2 },
      ],
    ],
    ["VESTAL", "monster_medium:p037", 2, [{ kind: "blight", remaining: 3, amount: 1 }]],
  ] as const) {
    const target = b.entities.find((e) => e.hero === name)!;
    const card = catalog.monsters.find((c) => c.id === page)!;
    const attack = readMonsterAttackView(card, slot);
    if (attack.status !== "ready") throw new Error(attack.reason);
    const range = readPrintedRange(attack.view);
    if (range.kind !== "exact") throw new Error("射程");
    const resolved = resolveMonsterSkill(
      card,
      slot,
      {
        actor: { id: actor.id, wounds: 0 },
        target: skillTargetView(target),
        areaDistance: range.distance,
        light: 5,
      },
      1,
    );
    if (resolved.status !== "resolved") throw new Error(resolved.reason);
    const result = applyBattleSkillStatuses(b, b.entities, actor.id, [resolved.resolution]);
    if (result.status !== "resolved") throw new Error(result.reason);
    const stacks = result.entities.find((e) => e.id === target.id)!.statusStacks!;
    expect(stacks).toEqual(expected);
    const repeat = applyBattleSkillStatuses(b, result.entities, actor.id, [resolved.resolution]);
    if (repeat.status !== "resolved") throw new Error(repeat.reason);
    expect(repeat.entities.find((e) => e.id === target.id)!.statusStacks).toEqual([
      ...expected,
      ...expected,
    ]);
    if (name === "CRUSADER" && page === "monster_medium:p034") {
      const tick = tickStatusStacks(stacks);
      expect(tick.status).toBe("resolved");
      if (tick.status === "resolved") {
        expect(tick.stunned).toBe(true);
        expect(tick.stacks.some((stack) => stack.kind === "stun")).toBe(false);
      }
    }
  }
  expect(b).toEqual(before);
});
it("缺失或伪造条件防御的任一英雄阻止实际负面状态房间入场，部署和 RNG 保持", () => {
  const initial = deploy(11),
    d = initial.dungeon!;
  for (const override of [
    undefined,
    { resistances: ["stun"], immunities: [], source: "print_front", approval: "wrong" },
  ]) {
    const bad = {
      ...initial,
      dungeon: {
        ...d,
        battleCatalog: {
          ...d.battleCatalog!,
          heroStats: d.battleCatalog!.heroStats.map((h, i) =>
            i !== 1 ? h : { ...h, verified_condition_defence: override },
          ),
        },
      },
    } as GameState;
    const result = applyCommand(bad, { type: "startDungeonBattle" });
    expect(result.state).toBe(bad);
    expect(result.events[0]?.type).toBe("commandRefused");
  }
});
it("胜利一次回传20金币与有限牌堆；同种子同命令回放，英雄状态不重置", () => {
  const s = terminal("victory"),
    before = structuredClone(s);
  const a = send(s, { type: "finishDungeonBattle" });
  expect(a).toEqual(send(terminal("victory"), { type: "finishDungeonBattle" }));
  expect(s).toEqual(before);
  expect(a.battle).toBeUndefined();
  expect(a.dungeon!.gold).toBe(20);
  expect(a.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBe(true);
  expect(a.dungeon!.roomCards!.discard).toEqual(["room:p001"]);
  expect(a.dungeon!.monsterPool!.remaining).toHaveLength(42);
  expect(new Set(a.dungeon!.monsterPool!.remaining).size).toBe(42);
  expect(a.dungeon!.cursor).toBe(s.battle!.rngCursor + 41);
  expect(a.dungeon!.heroes[0]!.combat!.wounds).toBe(1);
  expect(a.dungeon!.explorationSetup!.provisions).toEqual(s.battle!.provisions);
  expect(a.dungeon!.lootPool!.available).toHaveLength(10);
  expect(applyCommand(a, { type: "finishDungeonBattle" }).state).toBe(a);
});
it("战斗回传后休息同步地图英雄与战斗记录，不重置牌池或RNG", () => {
  const won = send(terminal("victory"), { type: "finishDungeonBattle" });
  // 原守卫夹具为测试20金币改了D代币；恢复Scout Ahead的真实种子构成。
  const original = createDungeonSandbox(goodSeed, layout, distribution).dungeon!.rooms;
  let s: GameState = {
    ...won,
    dungeon: {
      ...won.dungeon!,
      rooms: won.dungeon!.rooms.map((r) => ({
        ...r,
        kind: original.find((o) => o.id === r.id)!.kind,
      })),
    },
  };
  s = send(s, { type: "restDungeon" });
  const pick = (optionId: string) => {
    s = send(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
  };
  pick("equal");
  for (let i = 0; i < 4; i++) {
    pick(`heal:${i}`);
    pick(`stress:${i}`);
  }
  expect(
    s.dungeon!.heroes.every(
      (h) => h.wounds === 0 && h.stress === 0 && h.combat!.wounds === 0 && h.combat!.stress === 0,
    ),
  ).toBe(true);
  expect(s.dungeon!.cursor).toBe(won.dungeon!.cursor);
  expect(s.dungeon!.monsterPool).toEqual(won.dungeon!.monsterPool);
  expect(s.dungeon!.gold).toBe(20);
});
it("撤退不清房不发奖，须离开；保留弃房牌和洗回怪物的下一战牌序", () => {
  const a = send(terminal("retreat"), { type: "finishDungeonBattle" });
  expect(a.dungeon!.gold).toBe(0);
  expect(a.dungeon!.mustLeaveRoomId).toBe("D");
  expect(a.dungeon!.rooms.find((r) => r.id === "D")!.cleared).not.toBe(true);
  expect(applyCommand(a, { type: "scoutDungeon" }).state).toBe(a);
  expect(applyCommand(a, { type: "prepareDungeonBattle" }).state).toBe(a);
  expect(send(a, { type: "beginDungeonExploration" }).dungeon!.pending).toBeDefined();
});
it("Q-52 / 全灭、待选择与损坏牌池回传原子拒绝", () => {
  const s = terminal("victory"),
    d = s.dungeon!,
    b = s.battle!;
  const invalid: GameState[] = [
    {
      ...s,
      battle: {
        ...b,
        encounter: {
          ...b.encounter!,
          turn: { type: "halted", reason: "heroesDefeated", monstersDefeated: true },
        },
      },
    },
    { ...s, dungeon: { ...d, monsterPool: { ...d.monsterPool!, remaining: [] } } },
    {
      ...s,
      battle: {
        ...b,
        pending: {
          type: "turnStartProvision",
          actorId: "hero-0",
          choice: { id: "wait", prompt: "wait", options: [] },
        },
      },
    },
  ];
  for (const bad of invalid)
    expect(applyCommand(bad, { type: "finishDungeonBattle" }).state).toBe(bad);
});

it("入场前拒绝缺英雄属性、错误装备、非配套房间与损坏牌池，不进入半场战斗", () => {
  const s = deploy(goodSeed),
    d = s.dungeon!;
  const badStates: GameState[] = [
    { ...s, dungeon: { ...d, heroes: d.heroes.slice(1) } },
    {
      ...s,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 0
            ? { ...h, skillIds: ["hero_skill:p002", "hero_skill:p004", "hero_skill:p007"] }
            : h,
        ),
      },
    },
    { ...s, dungeon: { ...d, monsterPool: { ...d.monsterPool!, remaining: [] } } },
    {
      ...s,
      dungeon: {
        ...d,
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p002" } },
      },
    },
  ];
  for (const bad of badStates)
    expect(applyCommand(bad, { type: "startDungeonBattle" }).state).toBe(bad);
});

it("正式房间入场拒绝尚未解析的效果行，基础字段齐全也不能静默跳过", () => {
  const s = deploy(goodSeed),
    d = s.dungeon!;
  const cardId = d.monsterPool!.active!.monsters[0]!.cardId;
  const unsupported = [{ type: "text" as const, text: "unsupported fixture effect" }];
  const bad: GameState = {
    ...s,
    dungeon: {
      ...d,
      battleCatalog: {
        ...d.battleCatalog!,
        monsters: d.battleCatalog!.monsters.map((m) =>
          m.id !== cardId
            ? m
            : {
                ...m,
                skills: m.skills.map((skill) => ({
                  ...skill,
                  effect_lines: [...skill.effect_lines, unsupported],
                  lines: [...skill.lines, unsupported],
                })),
              },
        ),
      },
    },
  };
  const result = applyCommand(bad, { type: "startDungeonBattle" });
  expect(result.state).toBe(bad);
  expect(result.events[0]!.message).toContain("完整效果尚未接入");
});

it.each([1885, 11])("种子 %i 完整四轮走通真实怪物选招 / 定位 / 攻击，战后回传", (seed) => {
  let s = send(send(deploy(seed), { type: "startDungeonBattle" }), { type: "startBattle" });
  let observedBlight = false;
  for (let i = 0; i < 300 && s.battle!.encounter!.turn.type !== "finished"; i++) {
    const b = s.battle!,
      turn = b.encounter!.turn;
    observedBlight ||= b.entities.some(
      (e) => e.side === "hero" && e.statusStacks?.some((stack) => stack.kind === "blight"),
    );
    if (b.pending) {
      s = send(s, {
        type: "resolveChoice",
        choiceId: b.pending.choice.id,
        optionId: b.pending.choice.options[0]!.id,
      });
    } else if (b.shuffleIntents.length) s = send(s, { type: "resolveShuffles" });
    else if (turn.type === "awaitingInitiative") s = send(s, { type: "drawInitiative" });
    else if (turn.type === "hero") {
      const actor = b.entities.find((e) => e.id === turn.actorId)!;
      s = send(s, {
        type: "changeStance",
        actorId: actor.id,
        direction: actor.stance === "aggressive" ? "backward" : "forward",
      });
    } else if (turn.type === "monster") {
      const action = b.monsterAction;
      s = send(
        s,
        !action
          ? { type: "prepareMonsterAction", actorId: turn.actorId }
          : !action.positioned
            ? { type: "moveMonsterToRange", actorId: turn.actorId }
            : {
                type: "playMonsterSkill",
                actorId: turn.actorId,
                targetId: action.targetId,
                skillSlot: action.skillSlot,
              },
      );
    } else throw new Error(`未完成停点：${JSON.stringify(turn)}`);
  }
  expect(s.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
  expect(s.battle!.encounter!.round).toBe(4);
  expect(s.battle!.entities.filter((e) => e.side === "hero").some((e) => e.wounds > 1)).toBe(true);
  const result = send(s, { type: "finishDungeonBattle" });
  if (seed === 11) expect(observedBlight).toBe(true);
  expect(result.dungeon!.heroes.map((h) => h.combat?.statusStacks)).toEqual(
    s.battle!.entities.filter((e) => e.side === "hero").map((e) => e.statusStacks),
  );
  expect(result.dungeon!.gold).toBe(0);
  if (result.dungeon!.phase === "ready")
    expect(send(result, { type: "beginDungeonExploration" }).dungeon!.pending).toBeDefined();
  else expect(result.dungeon!.phase).toBe("awaitingReplacement");
});
