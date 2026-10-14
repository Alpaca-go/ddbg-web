import { applyCommand } from "../command";
import type { Command } from "../command";
import { coreQuestSources } from "./core-quest";
import { naturalParty, naturalQuest } from "./natural-quest";
import { createQuestSave } from "../quest-save";

/** 真实Scout Ahead seed14完成任务并回村，完整牌池自然抽到Caregivers；不注入怪癖。 */
export function caregiversQuest(sources = coreQuestSources) {
  const journey = naturalQuest(14, "quest:p001", false, sources);
  let game = journey.state;
  const commands: Command[] = [...journey.commands];
  const start = {
    seed: 14,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((event) => event.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    commands.push(command);
    game = result.state;
    return result;
  };
  let result = step({ type: "beginReturnToHamlet" });
  while (result.pendingChoice)
    result = step({
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
  step({ type: "finishReturnToHamlet" });
  step({ type: "drawHamletEvent" });
  if (game.dungeon!.hamlet!.last !== "hamlet_event:p012" || !game.dungeon!.pending)
    throw new Error("seed14尚未自然进入Caregivers怪癖待选");
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}
