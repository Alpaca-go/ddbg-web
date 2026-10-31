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
  const held = game.dungeon!.trinkets!.held;
  const buyOption = game.dungeon!.pending!.options.find(
    (o) =>
      o.id.startsWith("buy:") &&
      !held.some((entry) => o.id === `buy:${entry.cardId}`),
  );
  if (!buyOption) throw new Error("游商出售前置没有可购买的未持饰品");
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: buyOption.id,
  });
  const purchasedId = game.dungeon!.trinkets!.incoming!.cardId;
  const equipHero =
    game.dungeon!.pending!.options.find((o) => o.id === "equip:hero-0") &&
    game.dungeon!.trinkets!.held.filter((h) => h.heroId === "hero-0").length < 2
      ? "hero-0"
      : (["hero-1", "hero-2", "hero-3"] as const).find((id) =>
          game.dungeon!.pending!.options.some((o) => o.id === `equip:${id}`),
        ) ?? "hero-0";
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: `equip:${equipHero}`,
  });
  if (
    !game.dungeon!.trinkets!.held.some(
      (held) => held.cardId === purchasedId && held.heroId === equipHero,
    )
  )
    throw new Error("游商出售前置未装备刚购买的饰品");
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  if (game.dungeon!.hamlet!.blockedBuildings.includes("tavern")) {
    step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "heal5", quirkIds: [] });
  } else {
    step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  }
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
