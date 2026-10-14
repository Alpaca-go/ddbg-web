import { applyCommand } from "../command";
import type { Command } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { createQuestSave } from "../quest-save";
import { coreQuestSources } from "./core-quest";
import { naturalParty, naturalQuest } from "./natural-quest";

/** 真实Fundraiser seed2，不捐献；完整牌池/命令，无金币、持牌或牌序注入。 */
export function naturalAbbeyQuest(catalog = coreQuestSources.catalog) {
  const sources = { ...coreQuestSources, catalog };
  const journey = naturalQuest(2, "quest:p003", false, sources);
  const commands: Command[] = journey.commands.map((c, i) =>
    i === journey.commands.length - 1 && c.type === "resolveChoice"
      ? { ...c, optionId: "give:0" }
      : c,
  );
  const start = {
    seed: 2,
    questId: "quest:p003" as const,
    mode: "radiant" as const,
    party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  let game = createCoreDungeonQuest(2, start.questId, start.mode, naturalParty, sources);
  const apply = (c: Command) => {
    const r = applyCommand(game, c);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${c.type}: ${refused.message}`);
    game = r.state;
    return r;
  };
  for (const c of commands) apply(c);
  const step = (c: Command) => {
    commands.push(c);
    return apply(c);
  };
  let r = step({ type: "beginReturnToHamlet" });
  while (r.pendingChoice)
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  step({ type: "finishReturnToHamlet" });
  step({ type: "upgradeHamletBuilding", building: "abbey" });
  step({ type: "drawHamletEvent" });
  step({ type: "rollHamletCaretaker" });
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}
