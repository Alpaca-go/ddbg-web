import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { stagecoachWaitingTokens, recoveryBuildingLevel } from "./hamlet-buildings";
import { paidUpgradeQuest } from "./test-helpers/natural-scout-return";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { savedCommandSchema } from "../../data/src/quest-save";

let baseline: ReturnType<typeof paidUpgradeQuest>;
beforeAll(() => {
  baseline = paidUpgradeQuest();
}, 30000);
const upgrade: Command = { type: "upgradeHamletBuilding", building: "stagecoach" };
function ok(game: GameState, command: Command = upgrade) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}
it("R33首次I级两枚：读取旧状态不添加字段/改变快照，旧完整自然任务日志仍回放一致", () => {
  const game = baseline.game,
    before = structuredClone(game);
  expect(game.dungeon!.waitingHeroTokens).toBeUndefined();
  expect(recoveryBuildingLevel(game.dungeon!, "stagecoach")).toBe(1);
  expect(stagecoachWaitingTokens(game.dungeon!)).toBe(2);
  expect(game).toEqual(before);
  const restored = loadQuestSave(JSON.parse(JSON.stringify(baseline.save)), coreQuestSources).game;
  expect(restored).toEqual(game);
  expect(restored.dungeon!.waitingHeroTokens).toBeUndefined();
  expect(stagecoachWaitingTokens(restored.dungeon!)).toBe(2);
  expect(savedCommandSchema.safeParse(upgrade).success).toBe(true);
  expect(
    savedCommandSchema.safeParse({
      type: "visitHamletBuilding",
      actorId: "hero-0",
      serviceId: "stagecoach",
      quirkIds: [],
    }).success,
  ).toBe(false);
});
it("I→II→III各20金加一枚；封锁/已占建筑仍可团队升级，不消耗行动/天数/RNG，最高III", () => {
  const initial = ok(baseline.game, { type: "drawHamletEvent" });
  const started = ok(initial, { type: "rollHamletCaretaker" }),
    d = started.dungeon!;
  // 明示升级边界夹具：金币与封锁/访问记录，不冒充实际初始看守人。
  const game: GameState = {
    ...started,
    dungeon: {
      ...d,
      gold: 100,
      hamlet: {
        ...d.hamlet!,
        blockedBuildings: ["stagecoach"],
        visitedBuildings: ["tavern"],
        actedHeroes: [d.hamlet!.heroOrder[0]!],
      },
    },
  };
  const before = structuredClone(game),
    ii = ok(game),
    iii = ok(ii),
    n = iii.dungeon!;
  expect(ii.dungeon!.gold).toBe(80);
  expect(ii.dungeon!.buildingLevels!.stagecoach).toBe(2);
  expect(ii.dungeon!.waitingHeroTokens).toBe(3);
  expect(n.gold).toBe(60);
  expect(n.buildingLevels!.stagecoach).toBe(3);
  expect(n.waitingHeroTokens).toBe(4);
  expect(n.hamlet).toBe(game.dungeon!.hamlet);
  expect(n.heroes).toBe(d.heroes);
  expect(n.stagecoachXp).toBe(d.stagecoachXp);
  expect(n.cursor).toBe(d.cursor);
  expect(applyCommand(iii, upgrade).state).toBe(iii);
  expect(applyCommand(game, upgrade).state).toEqual(ii);
  expect(game).toEqual(before);
  // 显式已用完余额夹具：升级只加1，不把余额重置到总容量；消费流程尚未实现。
  const empty = { ...ii, dungeon: { ...ii.dungeon!, waitingHeroTokens: 0 } };
  expect(ok(empty).dungeon!.waitingHeroTokens).toBe(1);
});
it("余额非法、缺升级后余额、金币不足、事件/待选/阶段停点均原子拒绝，不凭空补代币", () => {
  const game = baseline.game,
    d = game.dungeon!;
  for (const value of [-1, 3, 1.5, null, Number.MAX_SAFE_INTEGER]) {
    const bad = { ...game, dungeon: { ...d, waitingHeroTokens: value } } as GameState;
    expect(stagecoachWaitingTokens(bad.dungeon!)).toBeNull();
    expect(applyCommand(bad, upgrade).state).toBe(bad);
  }
  for (const dungeon of [
    { ...d, gold: 19 },
    { ...d, phase: "ready" as const },
    { ...d, buildingLevels: { ...d.buildingLevels, stagecoach: 2 as const } },
    { ...d, pending: { id: "pending", prompt: "test", options: [] } },
    {
      ...d,
      hamlet: {
        deck: [],
        permanentlyRemoved: [],
        active: "hamlet_event:p001",
        last: "hamlet_event:p001",
        phase: "eventBlocked" as const,
        preparationDays: null,
        day: 1,
        noCaretaker: false,
        extraBlock: false,
        caretaker: null,
        blockedBuildings: [],
        heroOrder: [],
      },
    },
  ]) {
    const bad = { ...game, dungeon };
    expect(applyCommand(bad, upgrade).state).toBe(bad);
  }
  expect(ok({ ...game, dungeon: { ...d, gold: 20 } }).dungeon!.gold).toBe(0);
});
it("真实Scout Ahead seed6回村用30金升级II，保存刷新不重复发放/收费，XP与英雄行动保持", () => {
  let game = ok(baseline.game, { type: "drawHamletEvent" });
  const commands = [...baseline.commands, { type: "drawHamletEvent" } as const];
  const before = game.dungeon!;
  game = ok(game);
  const save = createQuestSave(baseline.start, [...commands, upgrade], game, coreQuestSources);
  const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game;
  expect(restored).toEqual(game);
  expect(restored.dungeon!.waitingHeroTokens).toBe(3);
  expect(restored.dungeon!.gold).toBe(before.gold - 20);
  expect(restored.dungeon!.stagecoachXp).toBe(before.stagecoachXp);
  expect(restored.dungeon!.hamlet).toEqual(before.hamlet);
  expect(restored.dungeon!.heroes).toEqual(before.heroes);
  expect(restored.dungeon!.cursor).toBe(before.cursor);
  expect(applyCommand(restored, upgrade).state).toBe(restored); // 剩余10金，不能再升级
}, 30000);
