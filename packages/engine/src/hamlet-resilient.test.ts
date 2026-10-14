import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { conditionPoolProblem } from "./conditions";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
function fixture(resilientHero = 0, actor = 0): GameState {
  const d = baseline.game.dungeon!;
  // 明示Resilient与压力边界夹具，不冒充自然任务获得该卡。唯一实体持牌，旧投影同步。
  const heroes = d.heroes.map((hero, i) => {
    const quirkIds = i === resilientHero ? ["quirk:p009"] : [];
    return {
      ...hero,
      stress: 8,
      quirkIds,
      ...(hero.combat ? { combat: { ...hero.combat, stress: 8, quirkIds } } : {}),
    };
  });
  const state: GameState = {
    ...baseline.game,
    dungeon: {
      ...d,
      heroes,
      gold: 100,
      conditions: { ...d.conditions!, positiveDeck: null, negativeDeck: null, quirkDiscard: [] },
      buildingLevels: { ...d.buildingLevels, tavern: 3, abbey: 3 },
      hamlet: {
        ...d.hamlet!,
        caretaker: null,
        blockedBuildings: [],
        visitedBuildings: [],
        actedHeroes: [],
        heroOrder: [
          heroes[actor]!.id,
          ...heroes.filter((_, i) => i !== actor).map((hero) => hero.id),
        ],
      },
    },
  };
  expect(conditionPoolProblem(state.dungeon!.conditions!, heroes)).toBeNull();
  return state;
}
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}
it("酒馆/修道院的每档减压只为Resilient持牌英雄多恢复1；价格、一次访问和当前英雄作用域照旧", () => {
  for (const [serviceId, base, cost, building] of [
    ["tavern3", 3, 1, "tavern"],
    ["tavern6", 6, 3, "tavern"],
    ["tavern9", 9, 9, "tavern"],
    ["abbeyStress3", 3, 1, "abbey"],
    ["abbeyStress6", 6, 3, "abbey"],
  ] as const) {
    const command: Command = {
      type: "visitHamletBuilding",
      actorId: "hero-0",
      serviceId,
      quirkIds: [],
    };
    for (const holder of [0, 1]) {
      const game = fixture(holder),
        before = structuredClone(game),
        d = game.dungeon!,
        next = ok(game, command).dungeon!;
      expect(next.heroes[0]!.stress).toBe(Math.max(0, 8 - base - Number(holder === 0)));
      expect(next.heroes[0]!.combat!.stress).toBe(next.heroes[0]!.stress);
      expect(next.heroes.slice(1).map((hero) => hero.stress)).toEqual([8, 8, 8]);
      expect(next.gold).toBe(100 - cost);
      expect(next.cursor).toBe(d.cursor);
      expect(next.conditions).toBe(d.conditions);
      expect(next.hamlet!.visitedBuildings).toEqual([building]);
      expect(next.hamlet!.actedHeroes).toEqual(["hero-0"]);
      expect(game).toEqual(before);
      expect(applyCommand(game, command).state).toEqual(ok(game, command));
    }
  }
});
it("Chant按每个目标自己的Resilient恢复，含施法者；Buff持续时间不增加、不耗额外行动", () => {
  for (const holder of [0, 3]) {
    const game = fixture(holder, 3),
      d = game.dungeon!;
    const next = ok(game, { type: "useHamletSkill", actorId: "hero-3", skill: "chant" }).dungeon!;
    expect(next.heroes.map((hero) => hero.stress)).toEqual(
      [0, 1, 2, 3].map((i) => (i === holder ? 6 : 7)),
    );
    expect(next.heroes.map((hero) => hero.combat!.stress)).toEqual(
      next.heroes.map((hero) => hero.stress),
    );
    for (const hero of next.heroes)
      expect(hero.statusStacks?.at(-1)).toEqual({ kind: "buff", remaining: 3 });
    expect(next.gold).toBe(d.gold);
    expect(next.cursor).toBe(d.cursor);
    expect(next.hamlet!.actedHeroes).toEqual(["hero-3"]);
    expect(next.hamlet!.visitedBuildings).toEqual([]);
  }
});
it("Zealous Speech全体每人最多多恢复一次，立即结束当天仍只减一天；Pray不影响其他英雄", () => {
  const game = fixture(2),
    d = game.dungeon!,
    next = ok(game, {
      type: "useHamletSkill",
      actorId: "hero-0",
      skill: "zealousSpeech",
    }).dungeon!;
  expect(next.heroes.map((hero) => hero.stress)).toEqual([3, 3, 2, 3]);
  expect(next.heroes.map((hero) => hero.combat!.stress)).toEqual([3, 3, 2, 3]);
  expect(next.hamlet!.remainingDays).toBe(d.hamlet!.preparationDays! - 1);
  expect(next.cursor).toBe(d.cursor);
  expect(next.gold).toBe(d.gold);
  const praying = fixture(3, 3),
    prayed = ok(praying, { type: "useHamletSkill", actorId: "hero-3", skill: "pray" }).dungeon!;
  expect(prayed.heroes.map((hero) => hero.stress)).toEqual([8, 8, 8, 0]);
  expect(prayed.heroes[3]!.statusStacks?.at(-1)).toEqual({ kind: "debuff", remaining: 6 });
});
it("压力最低零；越序和重复命令拒绝，下一英雄的另一次事件正常结算，不重复给前一英雄恢复", () => {
  const start = fixture(0),
    game = {
      ...start,
      dungeon: {
        ...start.dungeon!,
        heroes: start.dungeon!.heroes.map((hero) => ({ ...hero, stress: 1 })),
      },
    };
  const command: Command = {
    type: "visitHamletBuilding",
    actorId: "hero-0",
    serviceId: "tavern3",
    quirkIds: [],
  };
  expect(applyCommand(game, { ...command, actorId: "hero-1" }).state).toBe(game);
  const next = ok(game, command);
  expect(next.dungeon!.heroes[0]!.stress).toBe(0);
  expect(applyCommand(next, command).state).toBe(next);
  const after = ok(next, { type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
  expect(after.dungeon!.heroes[0]!.stress).toBe(0);
  const chant = fixture(0, 3),
    low = {
      ...chant,
      dungeon: {
        ...chant.dungeon!,
        heroes: chant.dungeon!.heroes.map((hero) => ({ ...hero, stress: 0 })),
      },
    };
  expect(
    ok(low, { type: "useHamletSkill", actorId: "hero-3", skill: "chant" }).dungeon!.heroes.map(
      (hero) => hero.stress,
    ),
  ).toEqual([0, 0, 0, 0]);
});
