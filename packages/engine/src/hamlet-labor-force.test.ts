import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { laborQuest } from "./test-helpers/labor-quest";
import { paidUpgradeQuest } from "./test-helpers/natural-scout-return";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { upgradableBuildings } from "./hamlet-buildings";
import { hamletActionOptions } from "./hamlet-actions";

let baseline: ReturnType<typeof laborQuest>;
beforeAll(() => {
  baseline = laborQuest();
});
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r.state;
}
const draw: Command = { type: "drawHamletEvent" };
function choose(game: GameState, optionId: string): Command {
  return { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId };
}
it("真实seed11入口离开/回村，完整池自然抽到Labor Force；待选冻结其他命令，保存回放一致", () => {
  const original = baseline.game,
    before = structuredClone(original),
    game = ok(original, draw);
  expect(game.dungeon!.hamlet).toMatchObject({
    active: "hamlet_event:p006",
    phase: "eventBlocked",
    preparationDays: null,
  });
  expect(game.dungeon!.pending!.options.map((o) => o.id)).toEqual([...upgradableBuildings, "skip"]);
  expect(game.dungeon!.cursor).toBe(original.dungeon!.cursor + 15);
  for (const c of [
    draw,
    { type: "rollHamletCaretaker" },
    { type: "upgradeHamletBuilding", building: "tavern" },
  ] as Command[])
    expect(applyCommand(game, c).state).toBe(game);
  const commands = [...baseline.commands, draw];
  const save = createQuestSave(baseline.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  expect(original).toEqual(before);
});
it("所有可升级建筑免费升一级/最高III；驿站只增一枚余额，金币/英雄/XP/游标不变，事件永久移出", () => {
  const game = ok(baseline.game, draw),
    d = game.dungeon!;
  for (const building of upgradableBuildings) {
    const next = ok(game, choose(game, building)),
      n = next.dungeon!;
    expect(n.buildingLevels![building]).toBe(2);
    expect(n.gold).toBe(d.gold);
    expect(n.heroes).toBe(d.heroes);
    expect(n.stagecoachXp).toBe(d.stagecoachXp);
    expect(n.cursor).toBe(d.cursor);
    expect(n.waitingHeroTokens).toBe(building === "stagecoach" ? 3 : d.waitingHeroTokens);
    expect(n.hamlet).toMatchObject({
      active: null,
      phase: "awaitingCaretaker",
      preparationDays: 3,
      permanentlyRemoved: ["hamlet_event:p006"],
      weekBlockedBuildings: [building],
    });
    expect(n.hamlet!.deck).toHaveLength(15);
    expect(n.hamlet!.deck).not.toContain("hamlet_event:p006");
    expect(applyCommand(next, choose(game, building)).state).toBe(next);
  }
  // 明示最高级/已消费余额夹具；不是自然任务状态。
  const altered = {
    ...baseline.game,
    dungeon: {
      ...baseline.game.dungeon!,
      buildingLevels: { tavern: 3 as const, stagecoach: 2 as const },
      waitingHeroTokens: 0,
    },
  };
  const pending = ok(altered, draw);
  expect(pending.dungeon!.pending!.options.some((o) => o.id === "tavern")).toBe(false);
  expect(ok(pending, choose(pending, "stagecoach")).dungeon!.waitingHeroTokens).toBe(1);
});
it("放弃仍永久移出；所有最高级仅放弃；伪造选项、坏牌池、坏等级和坏驿站余额不能发放", () => {
  const game = ok(baseline.game, draw),
    next = ok(game, choose(game, "skip"));
  expect(next.dungeon!.buildingLevels).toBe(game.dungeon!.buildingLevels);
  expect(next.dungeon!.hamlet!.weekBlockedBuildings).toBeUndefined();
  expect(next.dungeon!.hamlet!.permanentlyRemoved).toEqual(["hamlet_event:p006"]);
  for (const id of ["guild", "graveyard", "unknown"]) {
    const fake = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        pending: { ...game.dungeon!.pending!, options: [{ id, label: id }] },
      },
    };
    expect(applyCommand(fake, choose(fake, id)).state).toBe(fake);
  }
  const full = {
    ...baseline.game,
    dungeon: {
      ...baseline.game.dungeon!,
      buildingLevels: Object.fromEntries(upgradableBuildings.map((b) => [b, 3])),
      waitingHeroTokens: 4,
    },
  } as GameState;
  expect(ok(full, draw).dungeon!.pending!.options.map((o) => o.id)).toEqual(["skip"]);
  const corrupt = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      hamlet: { ...game.dungeon!.hamlet!, deck: game.dungeon!.hamlet!.deck.slice(1) },
    },
  };
  expect(applyCommand(corrupt, choose(corrupt, "abbey")).state).toBe(corrupt);
  const badTokens = { ...game, dungeon: { ...game.dungeon!, waitingHeroTokens: -1 } };
  expect(applyCommand(badTokens, choose(badTokens, "stagecoach")).state).toBe(badTokens);
  const badLevel = {
    ...game,
    dungeon: { ...game.dungeon!, buildingLevels: { abbey: 4 } },
  } as unknown as GameState;
  expect(applyCommand(badLevel, choose(badLevel, "abbey")).state).toBe(badLevel);
});
it("整周封锁跨三天；Intimidate遇到同栋看守人只移看守人，付费团队升级仍可进行", () => {
  let game = ok(ok(baseline.game, draw), choose(ok(baseline.game, draw), "tavern"));
  // 团队升级不受访问封锁影响；明示金币夹具，不称为自然付款。
  const funded = { ...game, dungeon: { ...game.dungeon!, gold: 20 } };
  expect(
    ok(funded, { type: "upgradeHamletBuilding", building: "tavern" }).dungeon!.buildingLevels!
      .tavern,
  ).toBe(3);
  for (let day = 1; day <= 3; day++) {
    game = ok(game, { type: "rollHamletCaretaker" });
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("tavern");
    // 明示看守人与Labor Force同栋夹具，验证解除看守人不抹掉事件封锁。
    const same: GameState = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: {
          ...game.dungeon!.hamlet!,
          caretaker: "tavern",
          blockedBuildings: ["tavern"],
          actedHeroes: ["hero-0"],
        },
      },
    };
    const removed = ok(same, { type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
    expect(removed.dungeon!.hamlet!.caretaker).toBeNull();
    expect(removed.dungeon!.hamlet!.blockedBuildings).toEqual(["tavern"]);
    // 正式三天通过Crusader的首行动提前结束；每次只减少一天，周封锁保留。
    game = ok(game, { type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("tavern");
    expect(
      hamletActionOptions(game).some(
        (o) => o.command.type === "visitHamletBuilding" && o.command.serviceId.startsWith("tavern"),
      ),
    ).toBe(false);
    expect(removed.dungeon!.hamlet!.weekBlockedBuildings).toEqual(["tavern"]);
  }
  expect(game.dungeon!.hamlet!.phase).toBe("preparationComplete");
});
it("真实公开命令免费升驿站，跨日保存刷新不重复发放或永久弃牌", () => {
  let game = baseline.game;
  const commands = [...baseline.commands];
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
  };
  step(draw);
  step(choose(game, "stagecoach"));
  step({ type: "rollHamletCaretaker" });
  step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
  step({ type: "rollHamletCaretaker" });
  const save = createQuestSave(baseline.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  expect(game.dungeon!.waitingHeroTokens).toBe(3);
  expect(game.dungeon!.hamlet!.permanentlyRemoved).toEqual(["hamlet_event:p006"]);
  expect(game.dungeon!.hamlet!.weekBlockedBuildings).toEqual(["stagecoach"]);
});
it("真实Scout Ahead seed6回村30金可付费升铁匠/游商各10金；最高级/缺钱原子拒绝并可存档", () => {
  const journey = paidUpgradeQuest(),
    commands = [...journey.commands];
  let game = journey.game;
  for (const building of ["blacksmith", "nomadWagon"] as const) {
    const command: Command = { type: "upgradeHamletBuilding", building };
    commands.push(command);
    const before = game;
    game = ok(game, command);
    expect(game.dungeon!.gold).toBe(before.dungeon!.gold - 10);
    expect(game.dungeon!.heroes).toBe(before.dungeon!.heroes);
    expect(game.dungeon!.cursor).toBe(before.dungeon!.cursor);
    expect(game.dungeon!.hamlet).toBe(before.dungeon!.hamlet);
    const iii: GameState = { ...game, dungeon: { ...game.dungeon!, gold: 10 } };
    const max = ok(iii, command);
    expect(max.dungeon!.buildingLevels![building]).toBe(3);
    expect(applyCommand(max, command).state).toBe(max);
    expect(
      applyCommand({ ...iii, dungeon: { ...iii.dungeon!, gold: 9 } }, command).events[0]!.type,
    ).toBe("commandRefused");
  }
  expect(game.dungeon!.gold).toBe(30);
  const save = createQuestSave(journey.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
}, 30000);
