import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
function fixture(level: 1 | 2 | 3 = 1): GameState {
  const game = baseline.game,
    d = game.dungeon!;
  // 明示建筑服务夹具；金币、等级及封锁与正式自然任务区分。
  return {
    ...game,
    dungeon: {
      ...d,
      gold: 100,
      buildingLevels: { ...d.buildingLevels, survivalist: level },
      hamlet: {
        ...d.hamlet!,
        blockedBuildings: [],
        caretaker: null,
        noCaretaker: true,
        extraBlock: false,
      },
    },
  };
}
const visit = (count = 1, actorId = "hero-0"): Command => ({
  type: "visitHamletBuilding",
  actorId,
  serviceId: `survivalist${count}` as "survivalist1" | "survivalist2" | "survivalist3",
  quirkIds: [],
});
const upgrade: Command = { type: "upgradeHamletBuilding", building: "survivalist" };
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r.state;
}
it("各等级服务实际支付官方价格，记录访问英雄的奖励，不提前掷骰/更改当前补给", () => {
  for (const [level, count, cost] of [
    [1, 1, 1],
    [2, 1, 1],
    [2, 2, 3],
    [3, 1, 0],
    [3, 2, 2],
    [3, 3, 4],
  ] as const) {
    const game = fixture(level),
      before = structuredClone(game),
      next = ok(game, visit(count));
    expect(next.dungeon!.gold).toBe(100 - cost);
    expect(next.dungeon!.heroes.map((h) => h.nextQuestProvisionDice ?? 0)).toEqual([
      count,
      0,
      0,
      0,
    ]);
    expect(next.dungeon!.cursor).toBe(game.dungeon!.cursor);
    expect(next.dungeon!.explorationSetup).toEqual(game.dungeon!.explorationSetup);
    expect(next.dungeon!.hamlet!.visitedBuildings).toEqual(["survivalist"]);
    expect(next.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
    expect(next.dungeon!.hamlet!.day).toBe(1);
    expect(applyCommand(next, visit(1, "hero-1")).state).toBe(next);
    expect(game).toEqual(before);
    expect(applyCommand(game, visit(count)).state).toEqual(next);
  }
});
it("封锁仍可升级，每级20金最高III；升级改变价格/可用档，不清奖励或英雄行动", () => {
  const game = fixture(),
    d = game.dungeon!;
  const blocked = {
    ...game,
    dungeon: { ...d, hamlet: { ...d.hamlet!, blockedBuildings: ["survivalist"] } },
  };
  const ii = ok(blocked, upgrade),
    iii = ok(ii, upgrade);
  expect(iii.dungeon!.gold).toBe(60);
  expect(iii.dungeon!.buildingLevels!.survivalist).toBe(3);
  expect(iii.dungeon!.hamlet).toBe(blocked.dungeon!.hamlet);
  expect(iii.dungeon!.cursor).toBe(d.cursor);
  expect(applyCommand(iii, upgrade).state).toBe(iii);
  expect(applyCommand(iii, visit()).state).toBe(iii);
  expect(
    hamletActionOptions(blocked).some(
      (o) =>
        o.command.type === "visitHamletBuilding" && o.command.serviceId.startsWith("survivalist"),
    ),
  ).toBe(false);
  const poor = {
    ...iii,
    dungeon: {
      ...iii.dungeon!,
      gold: 0,
      hamlet: { ...iii.dungeon!.hamlet!, blockedBuildings: [] },
    },
  };
  expect(ok(poor, visit()).dungeon!.gold).toBe(0);
  expect(applyCommand(poor, visit(2)).state).toBe(poor);
});
it("未开放档、越序、缺钱、非法累计数量与溢出原子拒绝", () => {
  const game = fixture(),
    d = game.dungeon!;
  expect(applyCommand(game, visit(2)).state).toBe(game);
  expect(applyCommand(game, visit(1, "hero-1")).state).toBe(game);
  expect(applyCommand(game, { ...visit(), quirkIds: ["quirk:p001"] } as Command).state).toBe(game);
  for (const value of [-1, 1.5, null, Number.MAX_SAFE_INTEGER]) {
    const bad = {
      ...game,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, nextQuestProvisionDice: value } : h)),
      },
    } as GameState;
    expect(applyCommand(bad, visit()).state).toBe(bad);
  }
  const poor = { ...game, dungeon: { ...d, gold: 0 } };
  expect(applyCommand(poor, visit()).state).toBe(poor);
});
it("多日奖励累加，访问消耗行动；准备结束保留计划，不冒充已获得骰面", () => {
  let game = fixture(3);
  const initial = game.dungeon!.explorationSetup;
  for (let day = 0; day < 4; day++) {
    game = ok(game, visit(3));
    game = ok(game, { type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId: "hero-2",
      serviceId: "tavern3",
      quirkIds: [],
    });
    game = ok(game, { type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
    if (day < 3) game = ok(game, { type: "rollHamletCaretaker" });
  }
  expect(game.dungeon!.heroes[0]!.nextQuestProvisionDice).toBe(12);
  expect(game.dungeon!.hamlet!.phase).toBe("preparationComplete");
  expect(game.dungeon!.explorationSetup).toBe(initial);
});
it("真实任务用真实金币升级II，Intimidate解除封锁后购买两颗奖励，次日/刷新回放不重复发放", () => {
  const commands = [...baseline.commands];
  let game = baseline.game;
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
  };
  step(upgrade);
  step({
    type: "visitHamletBuilding",
    actorId: "hero-0",
    serviceId: "abbeyPositiveQuirk",
    quirkIds: [],
  });
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: game.dungeon!.pending!.options.at(-1)!.id,
  });
  expect(applyCommand(game, visit(2, "hero-2")).state).toBe(game);
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
  const cursor = game.dungeon!.cursor,
    gold = game.dungeon!.gold;
  step(visit(2, "hero-2"));
  expect(game.dungeon!.gold).toBe(gold - 3);
  expect(game.dungeon!.cursor).toBe(cursor);
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  expect(game.dungeon!.heroes[2]!.nextQuestProvisionDice).toBe(2);
  const save = createQuestSave(baseline.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  expect(game.dungeon!.buildingLevels!.survivalist).toBe(2);
}, 30000);
