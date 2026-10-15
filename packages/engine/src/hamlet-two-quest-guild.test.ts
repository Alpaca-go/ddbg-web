import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { loadQuestSave } from "./quest-save";
import { coreQuestSources } from "./test-helpers/core-quest";
import { twoQuestGuildPath, withNaturalDisease } from "./test-helpers/two-quest-guild";
import { currentHamletHero } from "./hamlet-actions";

let baseline: ReturnType<typeof twoQuestGuildPath>;
beforeAll(() => {
  baseline = twoQuestGuildPath();
}, 120000);

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

it("seed14：Scout四房2XP→出征Wipe两巢穴2XP，自然累计4XP；同种子命令回放一致", () => {
  const d = baseline.game.dungeon!;
  expect(d.phase).toBe("inHamlet");
  expect(d.hamlet!.phase).toBe("heroActions");
  expect(d.heroes.map((h) => h.xp)).toEqual([4, 4, 4, 4]);
  expect(d.stagecoachXp).toBe(4);
  expect(d.gold).toBeGreaterThanOrEqual(2);
  expect(d.discardedQuests).toEqual(expect.arrayContaining(["quest:p001"]));
  expect(d.questSummary).toMatchObject({
    questId: "quest:p002",
    xpPerHero: 2,
    awarded: true,
  });
  expect(d.heroes.every((h) => h.level === 1 && !h.dead)).toBe(true);
  expect(baseline.commands.some((c) => c.type === "offerNextQuest")).toBe(true);
  expect(
    baseline.commands.some(
      (c) => c.type === "resolveChoice" && "optionId" in c && c.optionId === "quest:p002",
    ),
  ).toBe(true);
  expect(baseline.commands.some((c) => c.type === "useHamletSkill")).toBe(true);
  const replayed = loadQuestSave(
    JSON.parse(JSON.stringify(baseline.save)),
    coreQuestSources,
  ).game;
  expect(replayed).toEqual(baseline.game);
}, 120000);

it("自然4XP后Guild upgrade-hero升到II，并按牌堆守恒保留疾病（R29/34、R21、R-004）", () => {
  const actorId = baseline.actorId;
  expect(currentHamletHero(baseline.game)?.id).toBe(actorId);
  // 疾病夹具经 gainDisease 守恒抽牌，不写入命令日志；XP/金币仍为自然两任务结果。
  let game = withNaturalDisease(baseline.game, actorId);
  const diseaseId = game.dungeon!.heroes.find((h) => h.id === actorId)!.diseaseId!;
  expect(diseaseId).toMatch(/^disease:/);
  const gold = game.dungeon!.gold;
  const before = structuredClone(baseline.game);
  game = ok(game, { type: "visitGuild", actorId });
  expect(game.dungeon!.pending!.options.map((o) => o.id)).toContain("upgrade-hero");
  game = ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "upgrade-hero",
  });
  const hero = game.dungeon!.heroes.find((h) => h.id === actorId)!;
  const nextStat = game.dungeon!.battleCatalog!.heroStats.find(
    (s) => s.id === hero.heroStatId && s.level === 2,
  )!;
  expect(hero).toMatchObject({
    level: 2,
    xp: 0,
    diseaseId,
    attributesVerified: true,
    life: nextStat.life,
  });
  expect(game.dungeon!.gold).toBe(gold - 2);
  expect(baseline.game).toEqual(before);
}, 120000);
