import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { endAfterCasualties } from "../encounter";
import { coreQuestSources } from "./core-quest";
import { replacementStep } from "./replacement";

/** 正式已核实额外替补（开局四人死后）：赏金猎人、瘟疫医生、盗墓者、神秘学者。 */
export const VERIFIED_EXTRA_IDS = [
  "hero_stat:p005:front",
  "hero_stat:p013:front",
  "hero_stat:p017:front",
  "hero_stat:p019:front",
] as const;

/**
 * 从已进入战斗且可 finishDungeonBattle 的状态构造#236同款全灭交接，
 * 再按固定顺序公开准备四名已核实额外替补。调用方负责提供真实部署后的战斗态。
 */
export function prepareVerifiedWipeoutReplacements(battleState: GameState): {
  awaiting: GameState;
  prepared: GameState;
  commands: Command[];
} {
  const boundary: GameState = {
    ...battleState,
    dungeon: {
      ...battleState.dungeon!,
      battleCatalog: coreQuestSources.catalog,
      buildingLevels: { stagecoach: 3 },
      waitingHeroTokens: 4,
    },
    battle: {
      ...battleState.battle!,
      entities: battleState.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
    },
  };
  const ended = endAfterCasualties({ state: boundary, events: [] })!;
  let game = replacementStep(ended.state, { type: "ping", message: "登记机制夹具死者" });
  while (game.dungeon!.deathTrinketChoice)
    game = replacementStep(game, {
      type: "resolveChoice",
      choiceId: game.dungeon!.deathTrinketChoice!.id,
      optionId: "discard",
    });
  game = replacementStep(game, { type: "finishDungeonBattle" });
  const awaiting = game;
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    game = result.state;
    commands.push(command);
  };
  for (const id of VERIFIED_EXTRA_IDS) {
    step({ type: "prepareReplacementHero" });
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: id,
    });
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: "finish-upgrades",
    });
    while (game.dungeon!.replacementPreparation)
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.replacementPreparation!.choice.id,
        optionId: game.dungeon!.replacementPreparation!.choice.options[0]!.id,
      });
  }
  return { awaiting, prepared: game, commands };
}
