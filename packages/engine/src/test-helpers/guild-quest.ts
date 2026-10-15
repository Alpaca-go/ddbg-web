import { applyCommand } from "../command";
import type { Command } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { coreQuestSources } from "./core-quest";
import { createQuestSave } from "../quest-save";

/** Scout四房间真实获得2XP；仅测试决策驱动，不注入XP/金币/事件牌序。 */
export function guildQuest(sources = coreQuestSources, seed = 64) {
  const run = naturalQuest(seed, "quest:p001", false, sources, 4),
    commands = [...run.commands];
  let game = run.state;
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    commands.push(command);
    game = result.state;
  };
  const settle = () => {
    for (;;) {
      const choice = game.dungeon!.pending;
      if (!choice) return;
      step({ type: "resolveChoice", choiceId: choice.id, optionId: choice.options[0]!.id });
    }
  };
  const start = {
    seed,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  step({ type: "beginReturnToHamlet" });
  settle();
  step({ type: "finishReturnToHamlet" });
  step({ type: "drawHamletEvent" });
  settle();
  step({ type: "rollHamletCaretaker" });
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}
