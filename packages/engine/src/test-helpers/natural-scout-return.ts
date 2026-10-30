import { applyCommand } from "../command";
import type { Command } from "../command";
import { coreQuestSources } from "./core-quest";
import { naturalParty, naturalQuest } from "./natural-quest";
import { createQuestSave } from "../quest-save";

/** 完整 Scout Ahead 公开任务 / 回村日志，停在事件前；不替换奖励、持牌或牌序。 */
export function naturalScoutReturn(seed: number, sources = coreQuestSources) {
  const journey = naturalQuest(seed, "quest:p001", false, sources);
  let game = journey.state;
  const commands: Command[] = [...journey.commands];
  const start = {
    seed,
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
  // 战斗可能换位；R-093 的公开换姿态也进入回放，事件按确定的姿态顺序结算。
  step({ type: "setHamletStances", heroIds: ["hero-0", "hero-1", "hero-2", "hero-3"] });
  const d = game.dungeon!;
  if (
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.hamlet !== undefined ||
    d.pending ||
    d.heroes.some((hero) => hero.dead)
  )
    throw new Error(`Scout Ahead seed${seed} 未到达四英雄存活的事件前停点`);
  return { game, commands, start, save: createQuestSave(start, commands, game, sources) };
}

/** seed6 真实回村的30金，用于20金付费升级；不依赖抽到某一村庄事件。 */
export function paidUpgradeQuest(sources = coreQuestSources) {
  const journey = naturalScoutReturn(6, sources);
  if (journey.game.dungeon!.gold < 20) throw new Error("付费升级自然场景缺少20金，不能注入资金");
  return journey;
}
