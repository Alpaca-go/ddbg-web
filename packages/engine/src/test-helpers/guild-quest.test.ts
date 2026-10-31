import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../../apps/web/battle-data-plugin";
import { coreQuestSources } from "./core-quest";
import { guildQuest } from "./guild-quest";
import { applyCommand } from "../command";
import type { Command } from "../command";
import { createQuestSave, loadQuestSave } from "../quest-save";

it("正式网页目录的四房间2XP公会场景：访问、付款、结束均可按完整公开日志载入", () => {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load("\0virtual:quest-battle-data");
  const sources = {
    ...coreQuestSources,
    catalog: {
      ...JSON.parse(code.slice("export const battleData = ".length, -1)),
      trinkets: coreQuestSources.catalog.trinkets,
    },
  };
  const baseline = guildQuest(sources),
    commands = [...baseline.commands],
    before = structuredClone(baseline.game);
  let game = baseline.game;
  const checkSave = () =>
    expect(
      loadQuestSave(
        JSON.parse(JSON.stringify(createQuestSave(baseline.start, commands, game, sources))),
        sources,
      ).game,
    ).toEqual(game);
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
    commands.push(command);
    game = result.state;
    checkSave();
  };
  expect(baseline.start.seed).toBe(11);
  expect(game.dungeon!.gold).toBe(46);
  expect(game.dungeon!.questSummary).toMatchObject({
    questId: "quest:p001",
    xpPerHero: 2,
    awarded: true,
  });
  expect(game.dungeon!.heroes.map((hero) => [hero.dead ?? false, hero.xp])).toEqual([
    [false, 2],
    [false, 2],
    [false, 2],
    [false, 2],
  ]);
  expect(game.dungeon!.hamlet!.heroOrder).toEqual(["hero-0", "hero-1", "hero-2", "hero-3"]);
  expect(game.dungeon!.hamlet!.blockedBuildings).not.toContain("guild");
  checkSave();
  step({ type: "visitGuild", actorId: "hero-0" });
  expect(game.dungeon!.pending!.options.some((option) => option.id === "upgrade-hero")).toBe(false);
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "upgrade:hero_skill:p001",
  });
  expect(game.dungeon!.gold).toBe(45);
  expect(game.dungeon!.heroes[0]).toMatchObject({
    level: 1,
    xp: 0,
    permanentlyRemovedSkillIds: ["hero_skill:p001"],
  });
  expect(game.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p002");
  expect(game.dungeon!.pending!.options.map((option) => option.id)).toEqual(["leave"]);
  step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "leave" });
  expect(game.dungeon!.pending).toBeNull();
  expect(game.dungeon!.cursor).toBe(before.dungeon!.cursor);
  expect(game.dungeon!.hamlet!.remainingDays).toBe(before.dungeon!.hamlet!.remainingDays);
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(baseline.game).toEqual(before);
}, 30000);

it("自然任务虽可回村但公会被封锁时保留场景停点，不清空封锁", () => {
  expect(() => guildQuest(coreQuestSources, 27)).toThrow("公会访问前置");
}, 30000);
