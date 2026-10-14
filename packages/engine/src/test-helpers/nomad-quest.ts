import { applyCommand } from "../command";
import type { Command } from "../command";
import { naturalAbbeyQuest } from "./abbey-quest";
import { coreQuestSources } from "./core-quest";
import { createQuestSave } from "../quest-save";

/** 真实seed2提前退出/零XP回村；前三天按公开命令准备，第四天游商未封锁。 */
export function nomadQuest(catalog = coreQuestSources.catalog) {
  const journey = naturalAbbeyQuest(catalog),
    commands = [...journey.commands];
  let game = journey.game;
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    commands.push(command);
    game = result.state;
  };
  step({
    type: "visitHamletBuilding",
    actorId: "hero-0",
    serviceId: "graveyardVirtue",
    quirkIds: [],
  });
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  for (let i = 0; i < 2; i++) {
    step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    step({ type: "rollHamletCaretaker" });
  }
  const sources = { ...coreQuestSources, catalog };
  return {
    game,
    commands,
    start: journey.start,
    save: createQuestSave(journey.start, commands, game, sources),
  };
}
