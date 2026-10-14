import { applyCommand } from "../command";
import type { Command } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import { createQuestSave } from "../quest-save";
import { coreParty, coreQuestSources } from "./core-quest";

/** seed11完整牌池，真实入口→入口离开→零XP回村；接下来自然抽到Labor Force。 */
export function laborQuest(sources: CoreQuestSources = coreQuestSources) {
  const start = {
    seed: 11,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  let game = createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, sources);
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((event) => event.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    commands.push(command);
    game = result.state;
    return result;
  };
  let result = step({ type: "rollDungeonProvisions" });
  while (result.pendingChoice)
    result = step({
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
  result = step({ type: "leaveDungeon" });
  step({ type: "resolveChoice", choiceId: result.pendingChoice!.id, optionId: "agree" });
  step({ type: "summarizeDungeonQuest" });
  step({ type: "beginReturnToHamlet" });
  step({ type: "finishReturnToHamlet" });
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}
