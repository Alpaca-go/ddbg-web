import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { townFairQuest } from "./test-helpers/town-fair-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";

let baseline: ReturnType<typeof townFairQuest>;
beforeAll(() => {
  baseline = townFairQuest();
}, 30000);
const draw: Command = { type: "drawHamletEvent" };
function fair(game: GameState) {
  const result = applyCommand(game, draw);
  expect(
    result.events.some((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  expect(result.state.dungeon!.hamlet!.last).toBe("hamlet_event:p007");
  return result.state;
}
it("真实seed40任务回村自然抽到Town Fair，全体恢复后洗回并开启一天；保存刷新不重复发放", () => {
  const original = baseline.game,
    before = structuredClone(original),
    d = original.dungeon!;
  const game = fair(original),
    n = game.dungeon!;
  expect(n.heroes.map((hero) => [hero.wounds, hero.stress])).toEqual(
    d.heroes.map((hero) => [Math.max(0, hero.wounds! - 2), Math.max(0, hero.stress - 3)]),
  );
  expect(n.heroes.map((hero) => [hero.combat!.wounds, hero.combat!.stress])).toEqual(
    n.heroes.map((hero) => [hero.wounds, hero.stress]),
  );
  expect(n.cursor).toBe(d.cursor + 30);
  expect(n.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 1,
    day: 1,
    heroOrder: [],
  });
  expect(n.hamlet!.deck).toHaveLength(16);
  expect(n.gold).toBe(d.gold);
  expect(n.conditions).toBe(d.conditions);
  expect(n.trinkets).toBe(d.trinkets);
  expect(
    n.heroes.map((hero) => [hero.quirkIds, hero.diseaseId, hero.xp, hero.nextQuestProvisionDice]),
  ).toEqual(
    d.heroes.map((hero) => [hero.quirkIds, hero.diseaseId, hero.xp, hero.nextQuestProvisionDice]),
  );
  expect(applyCommand(game, draw).state).toBe(game);
  const commands = [...baseline.commands, draw];
  const save = createQuestSave(baseline.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  expect(applyCommand(original, draw).state).toEqual(game);
  expect(original).toEqual(before);
});
it("明示HL算术/怪癖夹具：2×各自等级，Infirm/Fast Healer/Resilient各触发一次，生命与压力不低于零", () => {
  const d = baseline.game.dungeon!,
    levels = [1, 2, 3, 1] as const;
  // II/III为算术测试的获批属性夹具，不冒充真实II/III数据已上线；重建完整隐式怪癖池。
  const game: GameState = {
    ...baseline.game,
    dungeon: {
      ...d,
      battleCatalog: {
        ...d.battleCatalog!,
        heroStats: d.battleCatalog!.heroStats.map((stat) => {
          const i = d.heroes.findIndex((hero) => hero.heroStatId === stat.id);
          return i < 0 ? stat : { ...stat, level: levels[i]! };
        }),
      },
      conditions: { ...d.conditions!, positiveDeck: null, negativeDeck: null, quirkDiscard: [] },
      heroes: d.heroes.map((hero, i) => ({
        ...hero,
        level: levels[i]!,
        stress: 8,
        wounds: 10,
        quirkIds: [["quirk:p022"], ["quirk:p003"], ["quirk:p009"], []][i]!,
      })),
    },
  };
  const next = fair(game).dungeon!;
  expect(next.heroes.map((hero) => hero.wounds)).toEqual([9, 4, 4, 8]);
  expect(next.heroes.map((hero) => hero.stress)).toEqual([5, 5, 4, 5]);
  expect(next.heroes.map((hero) => hero.combat!.wounds)).toEqual([9, 4, 4, 8]);
  const combined = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      heroes: game.dungeon!.heroes.map((hero, i) => ({
        ...hero,
        quirkIds: i === 2 ? ["quirk:p022", "quirk:p003"] : [],
      })),
    },
  };
  expect(fair(combined).dungeon!.heroes[2]!.wounds).toBe(2);
  const low = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      heroes: game.dungeon!.heroes.map((hero) => ({ ...hero, wounds: 0, stress: 1 })),
    },
  };
  expect(fair(low).dungeon!.heroes.map((hero) => [hero.wounds, hero.stress])).toEqual([
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
});
it("死门英雄可按治疗恢复，不掷死门骰；疾病、怪癖、补给及旧状态保持", () => {
  const d = baseline.game.dungeon!;
  // 明示生命边界夹具；事件治疗不是伤害，也不是复活。
  const game: GameState = {
    ...baseline.game,
    dungeon: {
      ...d,
      heroes: d.heroes.map((hero) => ({
        ...hero,
        wounds: hero.life!,
        statusStacks: [{ kind: "bleed", amount: 1, remaining: 2 }],
      })),
    },
  };
  const next = fair(game).dungeon!;
  expect(next.heroes.map((hero) => hero.wounds)).toEqual(d.heroes.map((hero) => hero.life! - 2));
  expect(next.cursor).toBe(d.cursor + 30);
  expect(next.heroes.map((hero) => hero.statusStacks)).toEqual(
    game.dungeon!.heroes.map((hero) => hero.statusStacks),
  );
  expect(next.explorationSetup).toBe(d.explorationSetup);
});
it("第四名英雄缺资料/生命无效/已死亡、坏牌池都在抽牌前原子拒绝，前面英雄不部分恢复", () => {
  const game = baseline.game,
    d = game.dungeon!;
  for (const patch of [
    { attributesVerified: false },
    { heroStatId: "missing" },
    { level: 0 },
    { wounds: 999 },
    { stress: 10 },
    { dead: true },
    { heroLevel: 3 },
  ]) {
    const bad = {
      ...game,
      dungeon: {
        ...d,
        heroes: d.heroes.map((hero, i) => (i === 3 ? { ...hero, ...patch } : hero)),
      },
    };
    const before = structuredClone(bad);
    expect(applyCommand(bad, draw).state).toBe(bad);
    expect(bad).toEqual(before);
  }
  const badPool = {
    ...game,
    dungeon: { ...d, conditions: { ...d.conditions!, quirkDiscard: ["missing"] } },
  };
  expect(applyCommand(badPool, draw).state).toBe(badPool);
});
