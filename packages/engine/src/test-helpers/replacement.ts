import { applyCommand } from "../command";
import type { Command, GameState } from "../command";

export function replacementStep(game: GameState, command: Command): GameState {
  const result = applyCommand(game, command);
  const refused = result.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(`${command.type}: ${refused.message}`);
  return result.state;
}
/** 只执行公开命令：弃死者饰品、选首个获批候选、零免费升级、逐张选初始技能。 */
export function prepareTestReplacement(game: GameState): GameState {
  while (game.dungeon!.deathTrinketChoice)
    game = replacementStep(game, {
      type: "resolveChoice",
      choiceId: game.dungeon!.deathTrinketChoice!.id,
      optionId: "discard",
    });
  game = replacementStep(game, { type: "prepareReplacementHero" });
  for (let n = 0; game.dungeon!.replacementPreparation && n < 8; n++) {
    const p = game.dungeon!.replacementPreparation!;
    game = replacementStep(game, {
      type: "resolveChoice",
      choiceId: p.choice.id,
      optionId: p.stage === "upgrades" ? "finish-upgrades" : p.choice.options[0]!.id,
    });
  }
  if (game.dungeon!.replacementPreparation) throw new Error("替补准备没有结束");
  return game;
}
