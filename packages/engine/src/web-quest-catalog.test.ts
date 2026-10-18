import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { replacementHeroCandidates } from "./hero-death-estate";

function webSources(quest: boolean, previous = false): CoreQuestSources {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load(
    `\0virtual:${quest ? `quest-battle-data${previous ? "-v1" : ""}` : "battle-data"}`,
  );
  const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
  return {
    ...coreQuestSources,
    catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
    resolveCards: catalog.resolveCards,
  };
}
const sources = webSources(true),
  fiveSources = webSources(true, true),
  previousSources = webSources(false);
const start = {
  seed: 14,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: naturalParty,
};

function naturalDeath(catalog: CoreQuestSources) {
  const run = naturalQuest(14, "quest:p001", true, catalog, 2, {
    observe(game) {
      if (!game.battle && game.dungeon!.phase === "ready" && game.dungeon!.position !== "S")
        throw new Error("observed-room");
    },
  });
  expect(run.stopReason).toBe("observed-room");
  let game = run.state;
  const commands: Command[] = [...run.commands];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    game = result.state;
    commands.push(command);
  };
  for (let n = 0; !game.dungeon!.heroes.some((h) => h.dead) && n < 25; n++) {
    step({ type: "scoutDungeon" });
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "agree" });
  }
  expect(game.dungeon!.heroes.some((h) => h.dead)).toBe(true);
  while (game.dungeon!.deathTrinketChoice)
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.deathTrinketChoice!.id,
      optionId: "discard",
    });
  return {
    get game() {
      return game;
    },
    commands,
    step,
  };
}

it("五英雄旧档在候选/升级/技能/入队各停点严格迁移，伪造待选和资源拒绝", () => {
  const run = naturalDeath(fiveSources);
  const trusted = [previousSources, fiveSources];
  const verify = () => {
    const save = createQuestSave(start, run.commands, run.game, fiveSources);
    const before = structuredClone(save);
    const loaded = loadQuestSave(save, sources, trusted).game;
    expect(save).toEqual(before);
    expect(loaded.dungeon!.battleCatalog!.heroStats).toHaveLength(18);
    expect(loaded.seed).toBe(run.game.seed);
    expect(loaded.dungeon!.cursor).toBe(run.game.dungeon!.cursor);
    expect(loaded.dungeon!.heroes).toEqual(run.game.dungeon!.heroes);
    expect(loaded.dungeon!.waitingHeroTokens).toBe(run.game.dungeon!.waitingHeroTokens);
    expect(
      loadQuestSave(createQuestSave(start, run.commands, loaded, sources), sources).game,
    ).toEqual(loaded);
    for (const bad of [
      { ...save, snapshot: { ...run.game, dungeon: { ...run.game.dungeon!, gold: 999 } } },
      { ...save, commands: [...run.commands, { type: "ping", message: "forged" }] },
    ])
      expect(() => loadQuestSave(bad, sources, trusted)).toThrow();
    return { loaded, save };
  };
  verify();
  run.step({ type: "prepareReplacementHero" });
  const { loaded, save } = verify();
  const preparation = run.game.dungeon!.replacementPreparation!;
  expect(preparation.choice.options.map((o) => o.id)).toEqual(["hero_stat:p005:front"]);
  expect(loaded.dungeon!.replacementPreparation!.choice.options.map((o) => o.id)).toEqual([
    "hero_stat:p005:front",
    "hero_stat:p013:front",
  ]);
  expect(loaded.dungeon!.replacementPreparation!.choice).toMatchObject({
    ...preparation.choice,
    options: expect.any(Array),
  });
  const forged = JSON.parse(JSON.stringify(save));
  forged.snapshot.dungeon.replacementPreparation.choice.options[0].label = "forged";
  expect(() => loadQuestSave(forged, sources, trusted)).toThrow();
  // 迁移后新增选项可继续执行，而非仅显示按钮。
  const chosen = applyCommand(loaded, {
    type: "resolveChoice",
    choiceId: preparation.choice.id,
    optionId: "hero_stat:p013:front",
  });
  expect(chosen.events.some((e) => e.type === "commandRefused")).toBe(false);
  const choice = (optionId: string) =>
    run.step({
      type: "resolveChoice",
      choiceId: run.game.dungeon!.replacementPreparation!.choice.id,
      optionId,
    });
  choice("hero_stat:p005:front");
  verify();
  choice("finish-upgrades");
  while (run.game.dungeon!.replacementPreparation) {
    verify();
    choice(run.game.dungeon!.replacementPreparation!.choice.options[0]!.id);
  }
  verify();
  run.step({ type: "joinPreparedReplacements" });
  verify();
}, 30000);

it("自然再次侦察多人死亡：第二名候选准备、禁止半队入场与代币耗尽存档", () => {
  const run = naturalDeath(sources);
  const deadNames: string[] = [];
  for (const id of ["hero_stat:p005:front", "hero_stat:p013:front"]) {
    while (run.game.dungeon!.deathTrinketChoice)
      run.step({
        type: "resolveChoice",
        choiceId: run.game.dungeon!.deathTrinketChoice!.id,
        optionId: "discard",
      });
    deadNames.push(...run.game.dungeon!.deadHeroNames!.filter((n) => !deadNames.includes(n)));
    run.step({ type: "prepareReplacementHero" });
    const choose = (optionId: string) =>
      run.step({
        type: "resolveChoice",
        choiceId: run.game.dungeon!.replacementPreparation!.choice.id,
        optionId,
      });
    choose(id);
    choose("finish-upgrades");
    while (run.game.dungeon!.replacementPreparation)
      choose(run.game.dungeon!.replacementPreparation!.choice.options[0]!.id);
    if (id === "hero_stat:p013:front") {
      expect(run.game.dungeon!.preparedReplacements).toHaveLength(1);
      expect(run.game.dungeon!.preparedReplacements![0]!.hero.heroStatId).toBe(id);
      expect(applyCommand(run.game, { type: "joinPreparedReplacements" }).state).toBe(run.game);
      expect(replacementHeroCandidates(run.game.dungeon!)).toEqual([]);
      expect(run.game.dungeon!.waitingHeroTokens).toBe(0);
      run.step({ type: "prepareReplacementHero" });
      expect(run.game.dungeon!.campaignFailure).toBe("noWaitingHeroes");
      const save = createQuestSave(start, run.commands, run.game, sources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(run.game);
      break;
    }
    run.step({ type: "joinPreparedReplacements" });
    expect(run.game.dungeon!.heroes).toHaveLength(4);
    expect(run.game.dungeon!.heroes.some((h) => h.heroStatId === id && !h.dead)).toBe(true);
    expect(run.game.dungeon!.deadHeroNames).toEqual(deadNames);
    const save = createQuestSave(start, run.commands, run.game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(run.game);
    if (id === "hero_stat:p005:front") {
      expect(replacementHeroCandidates(run.game.dungeon!).map((s) => s.name)).toEqual([
        "PLAGUE DOCTOR",
      ]);
      for (let n = 0; !run.game.dungeon!.heroes.some((h) => h.dead) && n < 30; n++) {
        run.step({ type: "scoutDungeon" });
        run.step({
          type: "resolveChoice",
          choiceId: run.game.dungeon!.pending!.id,
          optionId: "agree",
        });
      }
      expect(run.game.dungeon!.heroes.filter((h) => h.dead)).toHaveLength(3);
    }
  }
  expect(run.game.dungeon!.waitingHeroTokens).toBe(0);
  expect(replacementHeroCandidates(run.game.dungeon!)).toEqual([]);
}, 30000);

it("正式六英雄目录含两名替补各七张I级技能，旧五英雄/沙盒目录边界不变", () => {
  expect(previousSources.catalog.heroStats).toHaveLength(4);
  expect(previousSources.catalog.skills).toHaveLength(84);
  expect(fiveSources.catalog.heroStats).toHaveLength(15);
  expect(fiveSources.catalog.skills).toHaveLength(91);
  expect(sources.catalog.heroStats).toHaveLength(18);
  expect(sources.catalog.skills).toHaveLength(98);
  expect(
    sources.catalog.skills.filter((s) => s.hero === "PLAGUE DOCTOR").map((s) => s.level),
  ).toEqual(Array(7).fill(1));
  expect(
    sources.catalog.skills.filter((s) => s.hero === "BOUNTY HUNTER").map((s) => s.level),
  ).toEqual(Array(7).fill(1));
  const game = createCoreDungeonQuest(14, "quest:p001", "radiant", coreParty, sources);
  expect(game.dungeon!.heroes).toHaveLength(4);
  expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual([
    "BOUNTY HUNTER",
    "PLAGUE DOCTOR",
  ]);
});

it("旧网页存档先验证原目录再更新；伪造快照、日志及非目录变化仍拒绝", () => {
  const game = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    start.party,
    previousSources,
  );
  const save = createQuestSave(start, [], game, previousSources);
  expect(() => loadQuestSave(save, sources)).toThrow(/不一致/);
  const loaded = loadQuestSave(save, sources, previousSources);
  expect(loaded.game.dungeon!.battleCatalog!.heroStats).toHaveLength(18);
  expect(loaded.game).toEqual(
    createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, sources),
  );
  expect(loadQuestSave(createQuestSave(start, [], loaded.game, sources), sources).game).toEqual(
    loaded.game,
  );
  for (const bad of [
    { ...save, snapshot: { ...(save.snapshot as object), seed: 3 } },
    { ...save, snapshot: { ...game, dungeon: { ...game.dungeon!, gold: 99 } } },
    { ...save, commands: [{ type: "ping", message: "forged" }] },
  ])
    expect(() => loadQuestSave(bad, sources, previousSources)).toThrow();
  expect(() => loadQuestSave(save, { ...sources, rooms: [] }, previousSources)).toThrow();
  expect(() =>
    loadQuestSave(
      save,
      { ...sources, resolveCards: [...sources.resolveCards].reverse() },
      previousSources,
    ),
  ).toThrow(/改变了游戏结果/);
});

it("旧目录真实战斗待选存档更新卡目录后，行动、实体、待选和RNG完全保留", () => {
  const run = naturalQuest(1, "quest:p001", true, previousSources, 2, {
    observe(game) {
      if (game.battle?.pending) throw new Error("observed-battle");
    },
  });
  expect(run.stopReason).toBe("observed-battle");
  const entry = { ...start, seed: 1 };
  const save = createQuestSave(entry, run.commands, run.state, previousSources);
  const updated = loadQuestSave(save, sources, previousSources).game;
  expect(updated.battle!.heroStats).toHaveLength(18);
  expect(updated.battle!.skills).toHaveLength(98);
  expect(updated.battle).toEqual({
    ...run.state.battle!,
    heroStats: sources.catalog.heroStats,
    skills: sources.catalog.skills,
  });
  expect(
    loadQuestSave(createQuestSave(entry, run.commands, updated, sources), sources).game,
  ).toEqual(updated);
}, 30000);

it.each(["hero_stat:p005:front", "hero_stat:p013:front"])(
  "真实网页目录：自然死亡、%s候选/技能/入队与回村均可存档续接",
  (replacementId) => {
    const run = naturalQuest(14, "quest:p001", true, sources, 2, {
      observe(game) {
        if (!game.battle && game.dungeon!.phase === "ready" && game.dungeon!.position !== "S")
          throw new Error("observed-room");
      },
    });
    expect(run.stopReason).toBe("observed-room");
    let game: GameState = run.state;
    const commands: Command[] = [...run.commands];
    const step = (command: Command) => {
      const result = applyCommand(game, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      game = result.state;
      commands.push(command);
    };
    const saved = () => {
      const save = createQuestSave(start, commands, game, sources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
    };
    for (let n = 0; !game.dungeon!.heroes.some((h) => h.dead) && n < 25; n++) {
      step({ type: "scoutDungeon" });
      step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "agree" });
    }
    expect(game.dungeon!.heroes.some((h) => h.dead)).toBe(true);
    while (game.dungeon!.deathTrinketChoice)
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.deathTrinketChoice!.id,
        optionId: "discard",
      });
    saved();
    step({ type: "prepareReplacementHero" });
    saved();
    expect(game.dungeon!.replacementPreparation!.choice.options.map((o) => o.id)).toContain(
      replacementId,
    );
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: replacementId,
    });
    saved();
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: "finish-upgrades",
    });
    while (game.dungeon!.replacementPreparation)
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.replacementPreparation!.choice.id,
        optionId: game.dungeon!.replacementPreparation!.choice.options[0]!.id,
      });
    saved();
    step({ type: "joinPreparedReplacements" });
    expect(game.dungeon!.heroes.some((h) => h.heroStatId === replacementId && !h.dead)).toBe(true);
    saved();
    step({ type: "leaveDungeon" });
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "agree" });
    step({ type: "summarizeDungeonQuest" });
    step({ type: "beginReturnToHamlet" });
    while (game.dungeon!.pending)
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.pending!.id,
        optionId: game.dungeon!.pending!.options[0]!.id,
      });
    step({ type: "finishReturnToHamlet" });
    expect(game.dungeon!.phase).toBe("inHamlet");
    saved();
  },
  30000,
);
