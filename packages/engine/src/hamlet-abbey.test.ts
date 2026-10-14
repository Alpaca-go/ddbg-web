import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { conditionPoolProblem } from "./conditions";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";

function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}
const visit: Command = {
  type: "visitHamletBuilding",
  actorId: "hero-0",
  serviceId: "abbeyPositiveQuirk",
  quirkIds: [],
};
function fixture(held: readonly string[] = [], level: 1 | 2 | 3 = 2): GameState {
  let r = ok(createCoreDungeonQuest(40, "quest:p001", "radiant", coreParty, coreQuestSources), {
    type: "rollDungeonProvisions",
  });
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
  const d = r.state.dungeon!;
  // 明示服务边界夹具；金币、持牌和当日封锁不冒充自然任务结果。
  return {
    ...r.state,
    dungeon: {
      ...d,
      gold: 30,
      buildingLevels: { abbey: level },
      conditions: { ...d.conditions!, positiveDeck: null, negativeDeck: null },
      hamlet: { ...d.hamlet!, caretaker: null, blockedBuildings: [] },
      heroes: d.heroes.map((h, i) => ({
        ...h,
        quirkIds: i === 0 ? held : [],
        combat: {
          id: h.id,
          side: "hero",
          areaId: "A",
          hero: coreParty[i]!.heroStatId,
          skillIds: h.skillIds!,
          guard: false,
          dead: false,
          wounds: h.wounds!,
          stress: h.stress,
          dodge: 0,
          bleed: [],
          blight: [],
          quirkIds: i === 0 ? held : [],
        },
      })),
    },
  };
}
it("II/III级修道院支付3金抽完整正面堆、同步战斗投影并只完成一次行动", () => {
  for (const level of [2, 3] as const) {
    const game = fixture([], level),
      before = structuredClone(game);
    expect(
      hamletActionOptions(game).some(
        (o) =>
          o.command.type === "visitHamletBuilding" && o.command.serviceId === "abbeyPositiveQuirk",
      ),
    ).toBe(true);
    const r = ok(game, visit),
      d = r.state.dungeon!;
    expect(d.gold).toBe(27);
    expect(d.heroes[0]!.quirkIds).toHaveLength(1);
    expect(d.conditions!.positiveDeck).toHaveLength(16);
    expect(d.cursor).toBe(game.dungeon!.cursor + 16);
    expect(d.heroes[0]!.combat!.quirkIds).toEqual(d.heroes[0]!.quirkIds);
    expect(d.hamlet!.visitedBuildings).toEqual(["abbey"]);
    expect(d.hamlet!.actedHeroes).toEqual(["hero-0"]);
    expect(currentHamletHero(r.state)!.id).toBe("hero-1");
    expect(conditionPoolProblem(d.conditions!, d.heroes)).toBeNull();
    expect(applyCommand(game, visit)).toEqual(r);
    expect(game).toEqual(before);
    expect(applyCommand(r.state, { ...visit, actorId: "hero-1" }).state).toBe(r.state);
  }
});
it("第四怪癖只允许替换正面或弃新卡，冻结全部其他命令；选择不重复支付/抽牌", () => {
  const game = fixture(["quirk:p001", "quirk:p018", "quirk:p019"]);
  const r = ok(game, visit),
    p = r.pendingChoice!,
    d = r.state.dungeon!;
  expect(p.options.map((o) => o.id)).toEqual(["quirk:p001", d.conditions!.incomingQuirk!.cardId]);
  expect(d.hamlet!.actedHeroes ?? []).toEqual([]);
  expect(currentHamletHero(r.state)!.id).toBe("hero-0");
  for (const command of [
    visit,
    { type: "upgradeHamletBuilding", building: "tavern" },
    { type: "rollHamletCaretaker" },
    { type: "drawHamletEvent" },
    { type: "beginReturnToHamlet" },
    { type: "finishReturnToHamlet" },
    { type: "ping", message: "blocked" },
    { type: "resolveChoice", choiceId: p.id, optionId: "quirk:p018" },
    { type: "resolveChoice", choiceId: "expired", optionId: p.options[0]!.id },
  ] as Command[])
    expect(applyCommand(r.state, command).state).toBe(r.state);
  for (const option of p.options) {
    const selected = ok(r.state, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: option.id,
    }).state;
    expect(selected.dungeon!.gold).toBe(27);
    expect(selected.dungeon!.cursor).toBe(d.cursor);
    expect(selected.dungeon!.conditions!.quirkDiscard).toContain(option.id);
    expect(selected.dungeon!.heroes[0]!.quirkIds).toContain("quirk:p018");
    expect(selected.dungeon!.heroes[0]!.quirkIds).toHaveLength(3);
    expect(selected.dungeon!.heroes[0]!.combat!.quirkIds).toEqual(
      selected.dungeon!.heroes[0]!.quirkIds,
    );
    expect(selected.dungeon!.pending).toBeNull();
    expect(selected.dungeon!.conditions!.incomingQuirk).toBeUndefined();
    expect(currentHamletHero(selected)!.id).toBe("hero-1");
    expect(
      conditionPoolProblem(selected.dungeon!.conditions!, selected.dungeon!.heroes),
    ).toBeNull();
    expect(
      applyCommand(selected, { type: "resolveChoice", choiceId: p.id, optionId: option.id }).state,
    ).toBe(selected);
  }
});
it("三负面自动弃置新正面，仍付费占用且不死亡；最后一人待选完成才结束最后一天", () => {
  const r = ok(fixture(["quirk:p018", "quirk:p019", "quirk:p020"]), visit);
  expect(r.pendingChoice).toBeUndefined();
  expect(r.state.dungeon!.heroes[0]!.quirkIds).toEqual(["quirk:p018", "quirk:p019", "quirk:p020"]);
  expect(r.state.dungeon!.heroes[0]!.dead).toBeFalsy();
  expect(r.state.dungeon!.conditions!.quirkDiscard).toHaveLength(1);
  expect(r.state.dungeon!.gold).toBe(27);
  const game = fixture(["quirk:p001", "quirk:p002", "quirk:p018"]),
    d = game.dungeon!;
  const last = {
    ...game,
    dungeon: {
      ...d,
      hamlet: { ...d.hamlet!, remainingDays: 1, actedHeroes: ["hero-1", "hero-2", "hero-3"] },
    },
  };
  const pending = ok(last, visit);
  expect(pending.state.dungeon!.hamlet!.phase).toBe("heroActions");
  const finished = ok(pending.state, {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: pending.pendingChoice!.options[0]!.id,
  });
  expect(finished.state.dungeon!.hamlet!.phase).toBe("preparationComplete");
  expect(finished.state.dungeon!.hamlet!.remainingDays).toBe(0);
  expect(finished.state.dungeon!.buildingLevels).toEqual({ abbey: 2 });
});
it("I级、缺钱、封锁、越序、坏牌池、耗尽与非法参数原子拒绝", () => {
  const game = fixture(),
    d = game.dungeon!;
  const positives = d.conditions!.quirks.filter((q) => q.polarity === "positive").map((q) => q.id);
  for (const state of [
    fixture([], 1),
    { ...game, dungeon: { ...d, gold: 2 } },
    { ...game, dungeon: { ...d, hamlet: { ...d.hamlet!, blockedBuildings: ["abbey"] } } },
    {
      ...game,
      dungeon: {
        ...d,
        conditions: { ...d.conditions!, positiveDeck: [], quirkDiscard: positives },
      },
    },
    { ...game, dungeon: { ...d, conditions: { ...d.conditions!, positiveDeck: [] } } },
  ]) {
    expect(applyCommand(state, visit).state).toBe(state);
  }
  expect(applyCommand(game, { ...visit, actorId: "hero-1" }).state).toBe(game);
  expect(applyCommand(game, { ...visit, quirkIds: ["quirk:p001"] }).state).toBe(game);
});
it("真实Fundraiser命令路径支付服务、待选与选择完成后均可存档回放", () => {
  const journey = naturalAbbeyQuest();
  const game = journey.game;
  expect(game.dungeon!.hamlet!.last).toBe("hamlet_event:p013");
  const r = ok(game, visit);
  expect(r.pendingChoice).toBeDefined();
  const commands = [...journey.commands, visit];
  const save = createQuestSave(journey.start, commands, r.state, coreQuestSources);
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game;
  expect(loaded).toEqual(r.state);
  const choice: Command = {
    type: "resolveChoice",
    choiceId: r.pendingChoice!.id,
    optionId: r.pendingChoice!.options[0]!.id,
  };
  const restoredChoice = ok(loaded, choice),
    selected = ok(r.state, choice);
  expect(restoredChoice).toEqual(selected);
  expect(selected.state.dungeon!.gold).toBe(game.dungeon!.gold - 3);
  expect(selected.state.dungeon!.cursor).toBe(r.state.dungeon!.cursor);
  expect(currentHamletHero(selected.state)!.id).toBe("hero-1");
  expect(selected.state.dungeon!.heroes[0]!.combat!.quirkIds).toEqual(
    selected.state.dungeon!.heroes[0]!.quirkIds,
  );
  const completed = createQuestSave(
    journey.start,
    [...commands, choice],
    selected.state,
    coreQuestSources,
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(completed)), coreQuestSources).game).toEqual(
    selected.state,
  );
}, 20000);
