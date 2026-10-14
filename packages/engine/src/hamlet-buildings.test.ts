import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { recoveryServices, recoveryBuildingLevel } from "./hamlet-buildings";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { conditionPoolProblem } from "./conditions";

function ok(s: GameState, c: Command) {
  const r = applyCommand(s, c);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}
function fixture(): GameState {
  let s = createCoreDungeonQuest(40, "quest:p001", "radiant", coreParty, coreQuestSources);
  let r = ok(s, { type: "rollDungeonProvisions" });
  while (r.pendingChoice)
    r = ok(r.state, {
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  r = ok(r.state, { type: "leaveDungeon" });
  r = ok(r.state, { type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    r = ok(r.state, { type });
  s = r.state;
  // 规则边界夹具，明示测试金币/持牌，不冒充自然任务奖励。
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      gold: 100,
      hamlet: { ...s.dungeon!.hamlet!, blockedBuildings: ["sanitarium"], caretaker: "sanitarium" },
      heroes: s.dungeon!.heroes.map((h, i) => ({
        ...h,
        stress: 8,
        wounds: h.life!,
        ...(i === 0 ? { quirkIds: ["quirk:p001", "quirk:p018"], diseaseId: "disease:p001" } : {}),
      })),
    },
  };
}
const upgrade = (building: "abbey" | "tavern" | "sanitarium"): Command => ({
  type: "upgradeHamletBuilding",
  building,
});
const visit = (
  serviceId: "heal7" | "heal18" | "heal5" | "removeQuirks" | "tavernCureDisease" | "abbeyStress6",
  quirkIds: string[] = [],
): Command => ({ type: "visitHamletBuilding", actorId: "hero-0", serviceId, quirkIds });
it("看守人封锁或已访问的建筑仍可团队升级，不占用/减天/改变当前英雄/RNG；最高III级", () => {
  const s = fixture(),
    before = structuredClone(s);
  let game = ok(s, upgrade("sanitarium")).state;
  expect(game.dungeon!.buildingLevels).toEqual({ sanitarium: 2 });
  expect(game.dungeon!.gold).toBe(80);
  expect(game.dungeon!.hamlet).toBe(s.dungeon!.hamlet);
  expect(game.dungeon!.heroes).toBe(s.dungeon!.heroes);
  expect(game.dungeon!.cursor).toBe(s.dungeon!.cursor);
  expect(applyCommand(game, visit("heal7")).state).toBe(game); // 看守人依然封锁
  game = ok(game, upgrade("sanitarium")).state;
  expect(game.dungeon!.gold).toBe(60);
  expect(recoveryBuildingLevel(game.dungeon!, "sanitarium")).toBe(3);
  expect(applyCommand(game, upgrade("sanitarium")).state).toBe(game);
  expect(s).toEqual(before);
  const visited: GameState = {
    ...s,
    dungeon: { ...s.dungeon!, hamlet: { ...s.dungeon!.hamlet!, visitedBuildings: ["tavern"] } },
  };
  expect(ok(visited, upgrade("tavern")).state.dungeon!.hamlet!.visitedBuildings).toEqual([
    "tavern",
  ]);
});
it("R34三个等级恢复表：疗养院更换治疗档，酒馆II/III额外服务，修道院III减费用/压力", () => {
  const d = fixture().dungeon!;
  const rows = (building: "abbey" | "tavern" | "sanitarium", level: 1 | 2 | 3) =>
    recoveryServices({ ...d, buildingLevels: { [building]: level } })
      .filter((s) => s.building === building)
      .map((s) => [s.id, s.amount, s.cost]);
  expect(rows("sanitarium", 1)).toEqual([
    ["heal5", 5, 1],
    ["heal10", 10, 3],
    ["cureDisease", 0, 2],
  ]);
  expect(rows("sanitarium", 2)).toEqual([
    ["heal7", 7, 1],
    ["heal14", 14, 3],
    ["cureDisease", 0, 2],
  ]);
  expect(rows("sanitarium", 3)).toEqual([
    ["heal9", 9, 1],
    ["heal18", 18, 3],
    ["cureDisease", 0, 2],
  ]);
  expect(rows("tavern", 2)).toHaveLength(3);
  expect(rows("tavern", 3)).toEqual([
    ["tavern3", 3, 1],
    ["tavern6", 6, 3],
    ["tavern9", 9, 9],
    ["tavernHeal5", 5, 1],
    ["tavernHeal10", 10, 3],
    ["tavernCureDisease", 0, 2],
  ]);
  expect(rows("abbey", 3)).toEqual([
    ["removeQuirks", 0, 1],
    ["abbeyStress3", 3, 1],
    ["abbeyStress6", 6, 3],
  ]);
});
it("升级后只接受当前档位；疗养院III死门治疗、酒馆III疾病弃牌与修道院III选择费用正确", () => {
  const s = fixture(),
    d = s.dungeon!;
  const ready: GameState = {
    ...s,
    dungeon: { ...d, hamlet: { ...d.hamlet!, blockedBuildings: [], caretaker: null } },
  };
  let game = ok(ready, upgrade("sanitarium")).state;
  expect(applyCommand(game, visit("heal5")).state).toBe(game);
  const healed = ok(game, visit("heal7")).state;
  expect(healed.dungeon!.heroes[0]!.wounds).toBe(10);
  game = ok(game, upgrade("sanitarium")).state;
  expect(ok(game, visit("heal18")).state.dungeon!.heroes[0]!.wounds).toBe(0);
  expect(ok(game, visit("heal18")).state.dungeon!.cursor).toBe(game.dungeon!.cursor);
  game = ok(ok(ready, upgrade("tavern")).state, upgrade("tavern")).state;
  const cured = ok(game, visit("tavernCureDisease")).state;
  expect(cured.dungeon!.conditions!.diseaseDiscard).toEqual(["disease:p001"]);
  expect(cured.dungeon!.heroes[0]!.wounds).toBe(17);
  expect(conditionPoolProblem(cured.dungeon!.conditions!, cured.dungeon!.heroes)).toBeNull();
  game = ok(ok(ready, upgrade("abbey")).state, upgrade("abbey")).state;
  expect(ok(game, visit("removeQuirks", ["quirk:p001"])).state.dungeon!.gold).toBe(59);
  const removed = ok(game, visit("removeQuirks", ["quirk:p001", "quirk:p018"])).state;
  expect(removed.dungeon!.gold).toBe(56);
  expect(conditionPoolProblem(removed.dungeon!.conditions!, removed.dungeon!.heroes)).toBeNull();
  expect(ok(game, visit("abbeyStress6")).state.dungeon!.heroes[0]!.stress).toBe(2);
});
it("金币不足、事件停点、待选、错误阶段/建筑/等级原子拒绝，不伪造升级", () => {
  const s = fixture(),
    d = s.dungeon!;
  for (const game of [
    { ...s, dungeon: { ...d, gold: 19 } },
    { ...s, dungeon: { ...d, hamlet: { ...d.hamlet!, phase: "eventBlocked" as const } } },
    { ...s, dungeon: { ...d, phase: "ready" as const } },
    { ...s, dungeon: { ...d, pending: { id: "pending", prompt: "test", options: [] } } },
    { ...s, dungeon: { ...d, buildingLevels: { tavern: 4 } } } as unknown as GameState,
  ])
    expect(applyCommand(game, upgrade("tavern")).state).toBe(game);
  expect(
    applyCommand(s, { type: "upgradeHamletBuilding", building: "guild" } as unknown as Command)
      .state,
  ).toBe(s);
});
it("真实Fundraiser seed3选择不捐献保留金币，回村升级II并保存回放不重复扣费", () => {
  const journey = naturalQuest(3, "quest:p003");
  const commands: Command[] = journey.commands.map((c, i) =>
    i === journey.commands.length - 1 && c.type === "resolveChoice"
      ? { ...c, optionId: "give:0" }
      : c,
  );
  let game = createCoreDungeonQuest(3, "quest:p003", "radiant", naturalParty, coreQuestSources);
  for (const c of commands) game = ok(game, c).state;
  let r = ok(game, { type: "beginReturnToHamlet" });
  commands.push({ type: "beginReturnToHamlet" });
  while (r.pendingChoice) {
    const c: Command = {
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    };
    commands.push(c);
    r = ok(r.state, c);
  }
  game = ok(r.state, { type: "finishReturnToHamlet" }).state;
  commands.push({ type: "finishReturnToHamlet" });
  const gold = game.dungeon!.gold;
  expect(gold).toBeGreaterThanOrEqual(20);
  game = ok(game, upgrade("sanitarium")).state;
  commands.push(upgrade("sanitarium"));
  expect(game.dungeon!.gold).toBe(gold - 20);
  const save = createQuestSave(
    {
      seed: 3,
      questId: "quest:p003",
      mode: "radiant",
      party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    },
    commands,
    game,
    coreQuestSources,
  );
  const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game;
  expect(restored).toEqual(game);
  expect(restored.dungeon!.buildingLevels).toEqual({ sanitarium: 2 });
}, 20000);
