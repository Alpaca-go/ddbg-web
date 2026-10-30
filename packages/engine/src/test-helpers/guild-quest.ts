import { applyCommand } from "../command";
import type { Command } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { coreQuestSources } from "./core-quest";
import { createQuestSave } from "../quest-save";

/** seed11：Scout四房间真实获得2XP；不注入XP/金币/事件牌序或封锁状态。 */
export function guildQuest(sources = coreQuestSources, seed = 11) {
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
  // R-093：战斗可能改变姿态，公开恢复行动顺序并记录进正式存档。
  step({ type: "setHamletStances", heroIds: ["hero-0", "hero-1", "hero-2", "hero-3"] });
  step({ type: "drawHamletEvent" });
  settle();
  if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") step({ type: "rollHamletCaretaker" });
  const d = game.dungeon!;
  if (
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.questSummary?.xpPerHero !== 2 ||
    d.heroes.some((hero) => hero.dead || hero.xp !== 2) ||
    d.gold < 1 ||
    d.pending ||
    d.hamlet!.phase !== "heroActions" ||
    d.hamlet!.heroOrder[0] !== "hero-0" ||
    d.hamlet!.blockedBuildings.includes("guild")
  )
    throw new Error(`Guild seed${seed} 不满足四英雄存活、自然2XP和首行动公会访问前置`);
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}
