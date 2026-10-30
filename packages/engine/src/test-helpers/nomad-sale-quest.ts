import { applyCommand } from "../command";
import type { Command } from "../command";
import { naturalAbbeyQuest } from "./abbey-quest";
import { coreQuestSources } from "./core-quest";
import { createQuestSave } from "../quest-save";

/** 真实首日先购买，再按公开每日行动到另一天的未封锁游商；不注入持牌或牌序。 */
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
  const purchaseDay = game.dungeon!.hamlet!.day;
  step({ type: "visitNomadWagon", actorId: "hero-0" });
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id,
  });
  const purchasedId = game.dungeon!.trinkets!.incoming!.cardId;
  step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "equip:hero-0" });
  if (
    !game.dungeon!.trinkets!.held.some(
      (held) => held.cardId === purchasedId && held.heroId === "hero-0",
    )
  )
    throw new Error("游商出售前置未装备刚购买的饰品");
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  while (game.dungeon!.hamlet!.blockedBuildings.includes("nomadWagon")) {
    if ((game.dungeon!.hamlet!.remainingDays ?? 0) <= 1)
      throw new Error("游商自然出售场景没有剩余可访问准备日，不能覆盖封锁");
    skipBlockedDay();
  }
  if (game.dungeon!.hamlet!.day <= purchaseDay || game.dungeon!.hamlet!.phase !== "heroActions")
    throw new Error("游商自然出售前置须在购买后的另一天");
  return {
    game,
    commands,
    start: journey.start,
    save: createQuestSave(journey.start, commands, game, { ...coreQuestSources, catalog }),
  };
}
