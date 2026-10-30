import { applyCommand } from "../command";
import type { Command } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreQuestSources } from "./core-quest";
import { nomadQuest } from "./nomad-quest";

/** 自然seed68回村；不升级修道院，将实际金币用于游商升级，不注入金币/牌序。 */
export function nomadUpgradeQuest(level: 2 | 3, catalog = coreQuestSources.catalog) {
  const base = nomadQuest(catalog),
    start = base.start;
  const commands: Command[] = [];
  let game = createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, {
    ...coreQuestSources,
    catalog,
  });
  const step = (c: Command) => {
    const r = applyCommand(game, c);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    game = r.state;
    commands.push(c);
  };
  for (const c of base.commands)
    if (c.type !== "upgradeHamletBuilding" || c.building !== "abbey") step(c);
  for (let i = 1; i < level; i++) step({ type: "upgradeHamletBuilding", building: "nomadWagon" });
  return { start, commands, game };
}
