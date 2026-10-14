import { applyCommand } from "../command";
import type { Command } from "../command";
import { naturalAbbeyQuest } from "./abbey-quest";
import { coreQuestSources } from "./core-quest";
import { createQuestSave } from "../quest-save";

/** 真实seed2先买饰品，按公开每日行动到下一次未封锁游商；不注入持牌或牌序。 */
export function nomadSaleQuest(catalog = coreQuestSources.catalog) {
  const journey = naturalAbbeyQuest(catalog),
    commands = [...journey.commands];
  let game = journey.game;
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${refused.message}: ${JSON.stringify(game.dungeon!.hamlet)}`);
    commands.push(command);
    game = result.state;
  };
  const skipBlockedDay = () => {
    step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    step({ type: "rollHamletCaretaker" });
  };
  step({
    type: "visitHamletBuilding",
    actorId: "hero-0",
    serviceId: "abbeyPositiveQuirk",
    quirkIds: [],
  });
  while (game.dungeon!.pending)
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.pending!.id,
      optionId: game.dungeon!.pending!.options[0]!.id,
    });
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  step({
    type: "visitHamletBuilding",
    actorId: "hero-3",
    serviceId: "graveyardVirtue",
    quirkIds: [],
  });
  step({ type: "rollHamletCaretaker" });
  step({ type: "visitHamletBuilding", actorId: "hero-0", serviceId: "heal5", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
  step({ type: "visitNomadWagon", actorId: "hero-2" });
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id,
  });
  step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "equip:hero-0" });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  while (game.dungeon!.hamlet!.blockedBuildings.includes("nomadWagon")) {
    skipBlockedDay();
  }
  return {
    game,
    commands,
    start: journey.start,
    save: createQuestSave(journey.start, commands, game, { ...coreQuestSources, catalog }),
  };
}
