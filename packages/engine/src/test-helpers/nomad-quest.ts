import { applyCommand } from "../command";
import type { Command } from "../command";
import { naturalAbbeyQuest } from "./abbey-quest";
import { coreQuestSources } from "./core-quest";
import { createQuestSave } from "../quest-save";

/** seed68 真实回村，用公开准备日行动到第四天的游商窗口，不消费修道院服务。 */
export function nomadQuest(catalog = coreQuestSources.catalog) {
  const journey = naturalAbbeyQuest(catalog, 68),
    commands = [...journey.commands];
  let game = journey.game;
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    commands.push(command);
    game = result.state;
  };
  for (let i = 0; i < 3; i++) {
    step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    step({ type: "rollHamletCaretaker" });
  }
  const h = game.dungeon!.hamlet!;
  if (
    h.day !== 4 ||
    h.phase !== "heroActions" ||
    h.blockedBuildings.includes("nomadWagon") ||
    h.blockedBuildings.includes("tavern") ||
    game.dungeon!.gold < 5
  )
    throw new Error("游商自然场景前置漂移：需要第四天游商和酒馆可用及交易费用，不能覆盖封锁");
  const sources = { ...coreQuestSources, catalog };
  return {
    game,
    commands,
    start: journey.start,
    save: createQuestSave(journey.start, commands, game, sources),
  };
}
