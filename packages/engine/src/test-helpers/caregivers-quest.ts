import { applyCommand } from "../command";
import { coreQuestSources } from "./core-quest";
import { naturalScoutReturn } from "./natural-scout-return";
import { createQuestSave } from "../quest-save";

/** seed1 真实完成 Scout Ahead 并回村，自然进入 Caregivers；不注入怪癖。 */
export function caregiversQuest(sources = coreQuestSources) {
  const journey = naturalScoutReturn(1, sources);
  const draw = { type: "drawHamletEvent" } as const;
  const result = applyCommand(journey.game, draw);
  const refused = result.events.find((event) => event.type === "commandRefused");
  if (refused) throw new Error(refused.message);
  const game = result.state,
    commands = [...journey.commands, draw];
  if (game.dungeon!.hamlet!.last !== "hamlet_event:p012" || !game.dungeon!.pending)
    throw new Error("seed1尚未自然进入Caregivers怪癖待选");
  return {
    game,
    commands,
    start: journey.start,
    save: createQuestSave(journey.start, commands, game, sources),
  };
}
