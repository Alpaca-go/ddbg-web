import { applyCommand } from "../command";
import type { Command } from "../command";
import { coreQuestSources } from "./core-quest";
import { naturalParty, naturalQuest } from "./natural-quest";
import { createQuestSave } from "../quest-save";

/** 完整Scout Ahead seed64自然任务及回村；保存于Town Fair抽牌前，无状态/持牌注入。 */
export function townFairQuest(sources = coreQuestSources) {
  const journey = naturalQuest(64, "quest:p001", false, sources);
  let game = journey.state;
  const commands: Command[] = [...journey.commands];
  const start = {
    seed: 64,
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
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}
