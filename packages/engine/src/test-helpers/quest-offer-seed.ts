import { applyCommand } from "../command";
import type { GameState } from "../command";
import { basicQuests } from "../../../data/src/basic-quests";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { currentHamletHero } from "../hamlet-actions";
import { naturalQuest } from "./natural-quest";
import type { CoreQuestSources } from "../dungeon-quest-entry";

/** 回村并收束准备日后抽下一任务，返回候选项（会推进 cursor）。 */
export function offerNextQuestFromPrepared(game: GameState): readonly BasicQuestId[] {
  const result = applyCommand(game, { type: "offerNextQuest" });
  const refused = result.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(refused.message);
  return result.state.dungeon!.nextQuestOffers!;
}

function hamletReadyAfterQuest(
  seed: number,
  questId: BasicQuestId,
  sources: CoreQuestSources,
  rooms: number,
) {
  const first = naturalQuest(seed, questId, false, sources, rooms);
  let game = first.state;
  const step = (command: Parameters<typeof applyCommand>[1]) => {
    const r = applyCommand(game, command);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    game = r.state;
  };
  const settle = () => {
    while (game.dungeon!.pending) {
      step({
        type: "resolveChoice",
        choiceId: game.dungeon!.pending!.id,
        optionId: game.dungeon!.pending!.options[0]!.id,
      });
    }
  };
  step({ type: "beginReturnToHamlet" });
  settle();
  step({ type: "finishReturnToHamlet" });
  step({ type: "drawHamletEvent" });
  settle();
  if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") step({ type: "rollHamletCaretaker" });
  while (game.dungeon!.hamlet!.phase !== "preparationComplete") {
    if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      step({ type: "rollHamletCaretaker" });
      continue;
    }
    const actorId = currentHamletHero(game)!.id;
    step({ type: "useHamletSkill", actorId, skill: "zealousSpeech" });
  }
  return game;
}

/** 完成指定 I 级任务并收束准备日后，寻找下一任务候选项含 target 的种子。 */
export function scoutThenOfferSeed(
  sources: CoreQuestSources,
  target: BasicQuestId,
  afterQuest: BasicQuestId = "quest:p001",
  start = 14,
  tries = 120,
): number {
  for (let seed = start; seed < start + tries; seed++) {
    try {
      const offers = offerNextQuestFromPrepared(
        hamletReadyAfterQuest(seed, afterQuest, sources, afterQuest === "quest:p001" ? 4 : 2),
      );
      if (offers.includes(target)) return seed;
    } catch {
      /* skip */
    }
  }
  throw new Error(`未找到 ${afterQuest} 后抽到 ${target} 的种子（${start}+）`);
}

export function scoutThenWipeOfferSeed(sources: CoreQuestSources, start = 14, tries = 120): number {
  return scoutThenOfferSeed(sources, "quest:p002", "quest:p001", start, tries);
}

/** II 级出征验收：寻找 advance 后候选项同时含 p007 与 p008 的 Scout 种子。 */
export function scoutThenDualIiOfferSeed(
  sources: CoreQuestSources,
  start = 14,
  tries = 120,
): number {
  for (let seed = start; seed < start + tries; seed++) {
    try {
      const run = naturalQuest(seed, "quest:p001", false, sources, 4);
      let game = run.state;
      const step = (command: Parameters<typeof applyCommand>[1]) => {
        game = applyCommand(game, command).state;
      };
      const settle = () => {
        while (game.dungeon!.pending) {
          step({
            type: "resolveChoice",
            choiceId: game.dungeon!.pending!.id,
            optionId: game.dungeon!.pending!.options[0]!.id,
          });
        }
      };
      step({ type: "beginReturnToHamlet" });
      settle();
      step({ type: "finishReturnToHamlet" });
      step({ type: "drawHamletEvent" });
      settle();
      step({ type: "rollHamletCaretaker" });
      step({ type: "advanceCampaignLevel" });
      const offers = offerNextQuestFromPrepared({
        ...game,
        dungeon: {
          ...game.dungeon!,
          hamlet: {
            ...game.dungeon!.hamlet!,
            phase: "preparationComplete",
            remainingDays: 0,
            actedHeroes: [],
            visitedBuildings: [],
            heroOrder: [],
            caretaker: null,
            blockedBuildings: game.dungeon!.hamlet!.weekBlockedBuildings ?? [],
            active: null,
          },
        },
      });
      if (offers.includes("quest:p007") && offers.includes("quest:p008")) return seed;
    } catch {
      /* skip */
    }
  }
  throw new Error(`未找到 II 候选项同时含 p007/p008 的 Scout 种子（${start}+）`);
}

export function levelQuestIds(level: 1 | 2 | 3) {
  return basicQuests.filter((q) => q.level === level).map((q) => q.id);
}
