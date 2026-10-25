import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createQuestSave } from "../quest-save";
import { coreQuestSources } from "./core-quest";
import { naturalParty, naturalQuest } from "./natural-quest";
import { currentHamletHero } from "../hamlet-actions";
import { gainDisease } from "../conditions";
import { scoutThenWipeOfferSeed } from "./quest-offer-seed";

/**
 * 自然两任务攒满 4XP 后停在第二轮村庄 heroActions，供 Guild 升级验收。
 * Scout Ahead 四房 2XP → 出征 Wipe ‘Em Out 两巢穴 2XP（规格书 §13.1 / R-038，QUEST p1–p2）。
 * 第一轮村庄全部使用真实看守人/Zealous Speech命令，不注入准备结束状态。
 */
export function twoQuestGuildPath(sources = coreQuestSources, seed = 14) {
  seed = scoutThenWipeOfferSeed(sources, seed);
  const first = naturalQuest(seed, "quest:p001", false, sources, 4);
  const commands: Command[] = [...first.commands];
  let game = first.state;
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    commands.push(command);
    game = result.state;
    return result;
  };
  const settle = () => {
    while (game.dungeon!.pending) {
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.pending.id,
        optionId: game.dungeon!.pending.options[0]!.id,
      });
    }
  };
  const returnHome = () => {
    step({ type: "beginReturnToHamlet" });
    settle();
    step({ type: "finishReturnToHamlet" });
    step({ type: "drawHamletEvent" });
    settle();
    if (game.dungeon!.hamlet!.phase === "eventBlocked")
      throw new Error(`村庄事件未接通：${game.dungeon!.hamlet!.last}`);
    if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") step({ type: "rollHamletCaretaker" });
  };

  returnHome();
  // 只接受公开命令能完成的路径，不以天数夹具掩盖场景停点。
  while (game.dungeon!.hamlet!.phase !== "preparationComplete") {
    if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      step({ type: "rollHamletCaretaker" });
      continue;
    }
    const actorId = currentHamletHero(game)?.id;
    const canSpeech =
      actorId &&
      game.dungeon!.heroes.find((h) => h.id === actorId)?.heroStatId?.startsWith("hero_stat:p001");
    if (canSpeech) {
      step({ type: "useHamletSkill", actorId, skill: "zealousSpeech" });
      continue;
    }
    throw new Error("当前村庄不能通过首行动Zealous Speech结束准备日，保留真实停点");
  }

  step({ type: "offerNextQuest" });
  if (!game.dungeon!.nextQuestOffers?.includes("quest:p002"))
    throw new Error(`未抽到 Wipe ‘Em Out：${game.dungeon!.nextQuestOffers?.join(",")}`);
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "quest:p002",
  });

  const second = naturalQuest(seed, "quest:p002", false, sources, 2, {
    continueFrom: game,
    wipeLairs: 2,
  });
  commands.push(...second.commands);
  game = second.state;
  returnHome();

  const start = {
    seed,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  return {
    game,
    commands,
    start,
    save: createQuestSave(start, commands, game, sources),
    actorId: currentHamletHero(game)!.id,
  };
}

/** 在自然 4XP 状态上按牌堆守恒感染疾病，供升级保留断言；不写入命令日志。 */
export function withNaturalDisease(game: GameState, heroId: string): GameState {
  const d = game.dungeon!;
  const acquired = gainDisease(d.conditions!, d.heroes, heroId, game.seed, d.cursor);
  if (acquired.status !== "resolved") throw new Error(acquired.reason);
  return {
    ...game,
    dungeon: {
      ...d,
      cursor: acquired.cursor,
      conditions: acquired.pool,
      heroes: acquired.heroes,
    },
  };
}
