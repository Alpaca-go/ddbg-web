import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest, naturalGraveyardQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { hamletActionOptions } from "./hamlet-actions";
import { tickStatusStacks } from "./status";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
const sharpen: Command = { type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" };
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r.state;
}
function fixture(): GameState {
  const game = baseline.game,
    d = game.dungeon!;
  // 明示当前英雄/旧状态夹具，与真实公开命令路径区分。
  return {
    ...game,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        actedHeroes: ["hero-0"],
        blockedBuildings: ["survivalist"],
        visitedBuildings: ["abbey"],
      },
      heroes: d.heroes.map((h, i) =>
        i === 1
          ? {
              ...h,
              statusStacks: [
                { kind: "buff", remaining: 2 },
                { kind: "debuff", remaining: 3 },
              ],
            }
          : h,
      ),
    },
  };
}
it("Self Buff5t独立成堆并同步combat；不收费/掷骰/改压力或伤口/占建筑/移除看守人", () => {
  const game = fixture(),
    before = structuredClone(game),
    next = ok(game, sharpen);
  const d = game.dungeon!,
    n = next.dungeon!,
    hero = n.heroes[1]!;
  expect(hero.statusStacks).toEqual([
    { kind: "buff", remaining: 2 },
    { kind: "debuff", remaining: 3 },
    { kind: "buff", remaining: 5 },
  ]);
  expect(hero.combat!.statusStacks).toEqual(hero.statusStacks);
  expect(hero.combat!.buffStacks).toBe(2);
  expect(n.heroes.filter((h) => h.id !== "hero-1")).toEqual(
    d.heroes.filter((h) => h.id !== "hero-1"),
  );
  expect(hero.stress).toBe(d.heroes[1]!.stress);
  expect(hero.wounds).toBe(d.heroes[1]!.wounds);
  expect(n.gold).toBe(d.gold);
  expect(n.cursor).toBe(d.cursor);
  expect(n.hamlet).toMatchObject({
    actedHeroes: ["hero-0", "hero-1"],
    day: 1,
    visitedBuildings: ["abbey"],
    blockedBuildings: ["survivalist"],
  });
  expect(n.hamlet!.caretaker).toBe(d.hamlet!.caretaker);
  expect(n.hamlet!.remainingDays).toBe(d.hamlet!.remainingDays);
  expect(
    applyCommand(next, { type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" }).state,
  ).toBe(next);
  expect(game).toEqual(before);
  expect(ok(game, sharpen)).toEqual(next);
});
it("Self不套目标Buff抗性/免疫；状态由战斗回合计时，不按村庄天数衰减", () => {
  const game = fixture(),
    d = game.dungeon!;
  // 明示抗性/免疫边界：Self例外来自R20–21，不修改获批数据文件。
  const immune = {
    ...game,
    dungeon: {
      ...d,
      battleCatalog: {
        ...d.battleCatalog!,
        heroStats: d.battleCatalog!.heroStats.map((s) =>
          s.name === "HELLION"
            ? {
                ...s,
                verified_buff_defence: {
                  resistant: true,
                  immune: true,
                  source: "print_front" as const,
                },
              }
            : s,
        ),
      },
    },
  };
  const hero = ok(immune, sharpen).dungeon!.heroes[1]!;
  expect(hero.statusStacks!.at(-1)).toEqual({ kind: "buff", remaining: 5 });
  const tick = tickStatusStacks(hero.statusStacks!);
  expect(tick.status).toBe("resolved");
  if (tick.status === "resolved")
    expect(tick.stacks.at(-1)).toEqual({ kind: "buff", remaining: 4 });
});
it("错误身份/未核实属性/II级/坏状态/越序原子拒绝；只给当前Hellion显示两个村庄技能", () => {
  const game = fixture(),
    d = game.dungeon!;
  expect(
    hamletActionOptions(game)
      .filter((o) => o.command.type === "useHamletSkill")
      .map((o) => (o.command.type === "useHamletSkill" ? o.command.skill : "")),
  ).toEqual(["sharpenSpear", "intimidate"]);
  expect(applyCommand(baseline.game, sharpen).state).toBe(baseline.game);
  const wrong: Command = { type: "useHamletSkill", actorId: "hero-0", skill: "sharpenSpear" };
  expect(applyCommand(baseline.game, wrong).state).toBe(baseline.game);
  for (const statPatch of [{ attributesVerified: false }, { level: 2 }, { name: "HIGHWAYMAN" }]) {
    const bad = {
      ...game,
      dungeon: {
        ...d,
        battleCatalog: {
          ...d.battleCatalog!,
          heroStats: d.battleCatalog!.heroStats.map((s) =>
            s.name === "HELLION" ? { ...s, ...statPatch } : s,
          ),
        },
      },
    };
    expect(applyCommand(bad, sharpen).state).toBe(bad);
  }
  const broken = {
    ...game,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 1 ? { ...h, statusStacks: [{ kind: "buff", remaining: -1 }] } : h,
      ),
    },
  } as GameState;
  expect(applyCommand(broken, sharpen).state).toBe(broken);
});
it("真实seed3回村→墓地→Sharpen Spear→酒馆→Chant→次日/准备结束保存回放，Buff5t保持", () => {
  const journey = naturalGraveyardQuest();
  let game = journey.game;
  const commands = [...journey.commands];
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
  };
  step({
    type: "visitHamletBuilding",
    actorId: "hero-0",
    serviceId: "graveyardVirtue",
    quirkIds: [],
  });
  step(sharpen);
  expect(game.dungeon!.heroes[1]!.statusStacks!.at(-1)).toEqual({ kind: "buff", remaining: 5 });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  const stacks = game.dungeon!.heroes[1]!.statusStacks;
  expect(stacks).toEqual([
    { kind: "buff", remaining: 5 },
    { kind: "buff", remaining: 3 },
  ]);
  step({ type: "rollHamletCaretaker" });
  const save = createQuestSave(journey.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  for (let day = 0; day < 3; day++) {
    step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    if (day < 2) step({ type: "rollHamletCaretaker" });
  }
  expect(game.dungeon!.hamlet!.phase).toBe("preparationComplete");
  expect(game.dungeon!.heroes[1]!.statusStacks).toEqual(stacks);
  const final = createQuestSave(journey.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(final)), coreQuestSources).game).toEqual(game);
}, 30000);
