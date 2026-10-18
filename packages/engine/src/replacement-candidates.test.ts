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

function webSources(): CoreQuestSources {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load("\0virtual:quest-battle-data");
  const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
  return {
    ...coreQuestSources,
    catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
    resolveCards: catalog.resolveCards,
  };
}

const sources = webSources();
const start = {
  seed: 14,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: naturalParty,
};

const VERIFIED_EXTRA_IDS = ["hero_stat:p005:front", "hero_stat:p013:front"] as const;
const BANNED = ["JESTER", "ARBALEST", "GRAVE ROBBER", "OCCULTIST", "ABOMINATION"] as const;

it("库存：规范化仅六名attributesVerified；正式网页两名额外候选已接线且排除未核实身份", () => {
  const normalized = normalizedHeroStatFileSchema.parse(statsFile).cards;
  expect([...new Set(normalized.map((c) => c.name))].sort()).toEqual([
    "BOUNTY HUNTER",
    "CRUSADER",
    "HELLION",
    "HIGHWAYMAN",
    "PLAGUE DOCTOR",
    "VESTAL",
  ]);
  expect(normalized.every((c) => c.attributesVerified)).toBe(true);
  expect(sources.catalog.heroStats).toHaveLength(18);
  expect(sources.catalog.skills).toHaveLength(98);
  for (const name of BANNED)
    expect(sources.catalog.heroStats.some((s) => s.name === name)).toBe(false);
  const game = createCoreDungeonQuest(14, "quest:p001", "radiant", coreParty, sources);
  expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual([
    "BOUNTY HUNTER",
    "PLAGUE DOCTOR",
  ]);
  expect(
    replacementHeroCandidates(game.dungeon!).every(
      (s) => s.attributesVerified && s.level === 1 && VERIFIED_EXTRA_IDS.includes(s.id as never),
    ),
  ).toBe(true);
});

it("自然死亡：两名已核实额外候选各自prepare→join→createQuestSave/loadQuestSave往返", () => {
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
      [...VERIFIED_EXTRA_IDS].sort(),
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
    expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual(
      replacementId === "hero_stat:p005:front" ? ["PLAGUE DOCTOR"] : ["BOUNTY HUNTER"],
    );
    saved();
  }
}, 60000);
