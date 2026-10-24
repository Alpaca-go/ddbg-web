import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { replacementHeroCandidates } from "./hero-death-estate";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { VERIFIED_EXTRA_IDS } from "./test-helpers/wipeout-replacement";
import { VERIFIED_REPLACEMENT_NAMES } from "./test-helpers/verified-replacement";

function questSources(id = "quest-battle-data"): CoreQuestSources {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load(`\0virtual:${id}`);
  const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
  return {
    ...coreQuestSources,
    catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
    resolveCards: catalog.resolveCards,
  };
}

const sources = questSources();
const sixHeroSources = questSources("quest-battle-data-v2");
const start = {
  seed: 14,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: naturalParty,
};

const CORE_TRIO = ["JESTER", "ARBALEST", "ABOMINATION"] as const;
const EXTRA_NAMES = VERIFIED_REPLACEMENT_NAMES;

it("库存：规范化十一名核心 attributesVerified；扩展七名建队占位与四名替补候选", () => {
  const normalized = normalizedHeroStatFileSchema.parse(statsFile).cards;
  expect([...new Set(normalized.map((c) => c.name))].sort()).toEqual([
    "ABOMINATION",
    "ARBALEST",
    "BOUNTY HUNTER",
    "CRUSADER",
    "GRAVE ROBBER",
    "HELLION",
    "HIGHWAYMAN",
    "JESTER",
    "OCCULTIST",
    "PLAGUE DOCTOR",
    "VESTAL",
  ]);
  expect(normalized.every((c) => c.attributesVerified)).toBe(true);
  expect(normalized).toHaveLength(33);
  expect(sources.catalog.heroStats).toHaveLength(40);
  expect(sources.catalog.skills.length).toBeGreaterThan(112);
  expect(sixHeroSources.catalog.heroStats).toHaveLength(27);
  expect(sixHeroSources.catalog.skills).toHaveLength(98);
  for (const name of CORE_TRIO) {
    const stat = sources.catalog.heroStats.find((s) => s.name === name && s.level === 1);
    expect(stat?.attributesVerified).toBe(true);
    expect(stat?.life).toBeGreaterThan(1);
  }
  const game = createCoreDungeonQuest(14, "quest:p001", "radiant", coreParty, sources);
  expect(
    replacementHeroCandidates(game.dungeon!)
      .map((s) => s.name)
      .sort(),
  ).toEqual([...EXTRA_NAMES].sort());
  expect(
    replacementHeroCandidates(game.dungeon!).every((s) => s.attributesVerified && s.level === 1),
  ).toBe(true);
});

it("自然死亡：四名已核实额外候选各自prepare→join→createQuestSave/loadQuestSave往返", () => {
  for (const replacementId of VERIFIED_EXTRA_IDS) {
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
    while (game.dungeon!.deathTrinketChoice)
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.deathTrinketChoice!.id,
        optionId: "discard",
      });
    saved();
    step({ type: "prepareReplacementHero" });
    expect(game.dungeon!.replacementPreparation!.choice.options.map((o) => o.id).sort()).toEqual(
      replacementHeroCandidates(game.dungeon!)
        .map((s) => s.id)
        .sort(),
    );
    saved();
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: replacementId,
    });
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
    const chosen = sources.catalog.heroStats.find((s) => s.id === replacementId)!.name;
    expect(
      replacementHeroCandidates(game.dungeon!)
        .map((s) => s.name)
        .sort(),
    ).toEqual(EXTRA_NAMES.filter((name) => name !== chosen).sort());
    saved();
  }
}, 120000);
