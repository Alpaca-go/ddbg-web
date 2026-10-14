import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { coreQuestSources } from "./test-helpers/core-quest";
import { tickStatusStacks } from "./status";

const skill = (name: "pray" | "chant", actorId = "hero-3"): Command => ({
  type: "useHamletSkill",
  actorId,
  skill: name,
});
let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}
function fixture(): GameState {
  const game = baseline.game,
    d = game.dungeon!;
  // 明示技能边界：当前Vestal及压力/已有状态为规则夹具，不冒充自然任务。
  return {
    ...game,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        heroOrder: ["hero-3", "hero-0", "hero-1", "hero-2"],
        visitedBuildings: ["tavern"],
        blockedBuildings: ["abbey"],
      },
      heroes: d.heroes.map((h) => ({
        ...h,
        stress: 8,
        statusStacks: [{ kind: "buff", remaining: 2 }],
      })),
    },
  };
}
it("Pray只恢复自身压力并独立添加Debuff6t；不付费、不占建筑、不提前结束一天", () => {
  const game = fixture(),
    before = structuredClone(game),
    r = ok(game, skill("pray")),
    d = r.state.dungeon!;
  expect(d.heroes.map((h) => h.stress)).toEqual([8, 8, 8, 0]);
  expect(d.heroes[3]!.statusStacks).toEqual([
    { kind: "buff", remaining: 2 },
    { kind: "debuff", remaining: 6 },
  ]);
  expect(d.heroes[0]!.statusStacks).toEqual(game.dungeon!.heroes[0]!.statusStacks);
  expect(d.heroes[3]!.combat!.statusStacks).toEqual(d.heroes[3]!.statusStacks);
  expect(d.heroes[3]!.combat!.debuffStacks).toBe(1);
  expect(d.gold).toBe(game.dungeon!.gold);
  expect(d.cursor).toBe(game.dungeon!.cursor);
  expect(d.hamlet!.visitedBuildings).toEqual(["tavern"]);
  expect(d.hamlet!.blockedBuildings).toEqual(["abbey"]);
  expect(d.hamlet!.actedHeroes).toEqual(["hero-3"]);
  expect(d.hamlet!.day).toBe(1);
  expect(game).toEqual(before);
  expect(applyCommand(r.state, skill("pray")).state).toBe(r.state);
});
it("Chant全体压力不低于零，独立Buff3t堆保留旧堆；持续时间只按战斗回合消耗", () => {
  const game = fixture(),
    d = game.dungeon!;
  const target = {
    ...game,
    dungeon: { ...d, heroes: d.heroes.map((h, i) => ({ ...h, stress: i === 0 ? 0 : h.stress })) },
  };
  const r = ok(target, skill("chant"));
  expect(r.state.dungeon!.heroes.map((h) => h.stress)).toEqual([0, 7, 7, 7]);
  for (const h of r.state.dungeon!.heroes) {
    expect(h.statusStacks).toEqual([
      { kind: "buff", remaining: 2 },
      { kind: "buff", remaining: 3 },
    ]);
    expect(h.combat!.buffStacks).toBe(2);
    const tick = tickStatusStacks(h.statusStacks!);
    expect(tick.status).toBe("resolved");
    if (tick.status === "resolved")
      expect(tick.stacks).toEqual([
        { kind: "buff", remaining: 1 },
        { kind: "buff", remaining: 2 },
      ]);
  }
  expect(r.state.dungeon!.cursor).toBe(d.cursor);
  expect(
    hamletActionOptions(target)
      .filter((o) => o.command.type === "useHamletSkill")
      .map((o) => o.command),
  ).toEqual([skill("pray"), skill("chant")]);
});
it("Chant缺任何目标Buff防御或状态损坏时原子拒绝，不留下部分减压/状态", () => {
  const game = fixture(),
    d = game.dungeon!;
  for (const bad of [
    {
      ...game,
      dungeon: {
        ...d,
        battleCatalog: {
          ...d.battleCatalog!,
          heroStats: d.battleCatalog!.heroStats.map((s) =>
            s.name === "HIGHWAYMAN" ? { ...s, verified_buff_defence: undefined } : s,
          ),
        },
      },
    } as GameState,
    {
      ...game,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 2 ? { ...h, statusStacks: [{ kind: "buff", remaining: 0 }] } : h,
        ),
      },
    } as GameState,
  ])
    expect(applyCommand(bad, skill("chant")).state).toBe(bad);
  expect(applyCommand(game, skill("pray", "hero-0")).state).toBe(game);
  const wrongHero = {
    ...game,
    dungeon: {
      ...d,
      hamlet: { ...d.hamlet!, heroOrder: ["hero-0", "hero-1", "hero-2", "hero-3"] },
    },
  };
  expect(applyCommand(wrongHero, skill("chant", "hero-0")).state).toBe(wrongHero);
});
it("真实任务村庄顺序完成Pray/Chant、次日与准备结束都保存回放且不重复效果", () => {
  for (const name of ["pray", "chant"] as const) {
    const journey = baseline,
      commands = [...journey.commands];
    let game = journey.game;
    const step = (c: Command) => {
      commands.push(c);
      const r = ok(game, c);
      game = r.state;
      return r;
    };
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
    step({ type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
    step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
    const before = game.dungeon!;
    step(skill(name));
    expect(game.dungeon!.hamlet!.phase).toBe("awaitingCaretaker");
    expect(game.dungeon!.hamlet!.remainingDays).toBe(3);
    expect(game.dungeon!.cursor).toBe(before.cursor);
    expect(game.dungeon!.gold).toBe(before.gold);
    const stacks = game.dungeon!.heroes.map((h) => h.statusStacks);
    step({ type: "rollHamletCaretaker" });
    expect(game.dungeon!.heroes.map((h) => h.statusStacks)).toEqual(stacks);
    const save = createQuestSave(journey.start, commands, game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
    for (let day = 0; day < 3; day++) {
      step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
      if (day < 2) step({ type: "rollHamletCaretaker" });
    }
    expect(game.dungeon!.hamlet!.phase).toBe("preparationComplete");
    expect(game.dungeon!.heroes.map((h) => h.statusStacks)).toEqual(stacks);
    const final = createQuestSave(journey.start, commands, game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(final)), coreQuestSources).game).toEqual(game);
  }
}, 30000);
