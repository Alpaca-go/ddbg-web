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

function webSources(quest: boolean): CoreQuestSources {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load(`\0virtual:${quest ? "quest-battle-data" : "battle-data"}`);
  const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
  return {
    ...coreQuestSources,
    catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
    resolveCards: catalog.resolveCards,
  };
}
const sources = webSources(true),
  previousSources = webSources(false);
const start = {
  seed: 14,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: naturalParty,
};

it("网页战役目录包含五英雄获批属性和赏金猎人七张I级技能；战斗沙盒与开局四人不变", () => {
  expect(previousSources.catalog.heroStats).toHaveLength(4);
  expect(previousSources.catalog.skills).toHaveLength(84);
  expect(sources.catalog.heroStats).toHaveLength(15);
  expect(sources.catalog.skills).toHaveLength(91);
  expect(
    sources.catalog.skills.filter((s) => s.hero === "BOUNTY HUNTER").map((s) => s.level),
  ).toEqual(Array(7).fill(1));
  const game = createCoreDungeonQuest(14, "quest:p001", "radiant", coreParty, sources);
  expect(game.dungeon!.heroes).toHaveLength(4);
  expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual(["BOUNTY HUNTER"]);
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
  expect(loaded.game.dungeon!.battleCatalog!.heroStats).toHaveLength(15);
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
  expect(updated.battle!.heroStats).toHaveLength(15);
  expect(updated.battle!.skills).toHaveLength(91);
  expect(updated.battle).toEqual({
    ...run.state.battle!,
    heroStats: sources.catalog.heroStats,
    skills: sources.catalog.skills,
  });
  expect(
    loadQuestSave(createQuestSave(entry, run.commands, updated, sources), sources).game,
  ).toEqual(updated);
}, 30000);

it("真实网页目录：自然侦察死亡、赏金猎人候选/技能/入队与回村均可存档续接", () => {
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
    "hero_stat:p005:front",
  );
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.replacementPreparation!.choice.id,
    optionId: "hero_stat:p005:front",
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
  expect(game.dungeon!.heroes.some((h) => h.heroStatId === "hero_stat:p005:front" && !h.dead)).toBe(
    true,
  );
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
}, 30000);
