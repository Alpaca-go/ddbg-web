import { applyCommand } from "../command";
import type { GameState } from "../command";
import type { Command } from "../command";
import { basicQuests } from "../../../data/src/basic-quests";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { currentHamletHero } from "../hamlet-actions";
import { naturalParty, naturalQuest } from "./natural-quest";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import { guildQuest } from "./guild-quest";
import { createQuestSave } from "../quest-save";

/** 回村并收束准备日后抽下一任务，返回候选项（会推进 cursor）。 */
export function offerNextQuestFromPrepared(game: GameState): readonly BasicQuestId[] {
  const result = applyCommand(game, { type: "offerNextQuest" });
  const refused = result.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(refused.message);
  return result.state.dungeon!.nextQuestOffers! as readonly BasicQuestId[];
}

/** 完成指定 I 级任务、回村结算与村庄准备日后停在 `preparationComplete`（可回放存档）。 */
export function firstQuestHamletReadySave(
  sources: CoreQuestSources,
  seed = 14,
  questId: BasicQuestId = "quest:p001",
  rooms = 4,
) {
  const first = naturalQuest(seed, questId, false, sources, rooms);
  let game = first.state;
  const commands: Command[] = [...first.commands];
  const step = (command: Command) => {
    const r = applyCommand(game, command);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    game = r.state;
    commands.push(command);
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
  const start = {
    seed,
    questId,
    mode: "radiant" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  return {
    game,
    commands,
    start,
    save: createQuestSave(start, commands, game, sources),
  };
}

function hamletReadyAfterQuest(
  seed: number,
  questId: BasicQuestId,
  sources: CoreQuestSources,
  rooms: number,
) {
  return firstQuestHamletReadySave(sources, seed, questId, rooms).game;
}

/** 完成指定 I 级任务并收束准备日后，寻找下一任务候选项含 target 的种子。 */
export function scoutThenOfferSeed(
  sources: CoreQuestSources,
  target: BasicQuestId,
  afterQuest: BasicQuestId = "quest:p001",
  start = 14,
  tries = 400,
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

export function scoutThenWipeOfferSeed(sources: CoreQuestSources, start = 14, tries = 400): number {
  try {
    const offers = offerNextQuestFromPrepared(
      hamletReadyAfterQuest(start, "quest:p001", sources, 4),
    );
    if (offers.includes("quest:p002")) return start;
  } catch {
    /* fall through */
  }
  return scoutThenOfferSeed(sources, "quest:p002", "quest:p001", start + 1, tries - 1);
}

function preparationReadyForIiOffer(game: GameState): GameState {
  const d = game.dungeon!,
    h = d.hamlet!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...h,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: h.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

function stepUnlessRefused(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  if (result.events.some((e) => e.type === "commandRefused")) return null;
  return result.state;
}

/** II 级出征验收：与 `guildQuest` + 准备日收束夹具一致，寻找 advance 后候选项同时含 p007 与 p008 的种子。 */
export function scoutThenDualIiOfferSeed(
  sources: CoreQuestSources,
  start = 0,
  tries = 800,
): number {
  for (let seed = start; seed < start + tries; seed++) {
    try {
      const { game } = guildQuest(sources, seed);
      let state: GameState | null = preparationReadyForIiOffer(game);
      state = stepUnlessRefused(state, { type: "advanceCampaignLevel" });
      if (!state) continue;
      state = stepUnlessRefused(state, { type: "offerNextQuest" });
      if (!state) continue;
      const offers = state.dungeon!.nextQuestOffers! as readonly BasicQuestId[];
      if (offers.includes("quest:p007") && offers.includes("quest:p008")) return seed;
    } catch {
      /* skip */
    }
  }
  throw new Error(`未找到 II 候选项同时含 p007/p008 的 Scout 种子（${start}+）`);
}

/** II 自然重放：返回 guildQuest 夹具，使 advance 后抽到的两张候选项含指定 II 级任务。 */
export function guildQuestForIiOffer(
  sources: CoreQuestSources,
  questId: "quest:p007" | "quest:p008",
  start = 0,
  tries = 500,
) {
  for (let seed = start; seed < start + tries; seed++) {
    try {
      const base = guildQuest(sources, seed);
      const game = {
        ...base.game,
        dungeon: {
          ...base.game.dungeon!,
          hamlet: {
            ...base.game.dungeon!.hamlet!,
            phase: "preparationComplete" as const,
            remainingDays: 0,
            actedHeroes: [],
            visitedBuildings: [],
            heroOrder: [],
            caretaker: null,
            blockedBuildings: base.game.dungeon!.hamlet!.weekBlockedBuildings ?? [],
            active: null,
          },
        },
      };
      const advanced = applyCommand(game, { type: "advanceCampaignLevel" });
      if (advanced.events.some((e) => e.type === "commandRefused")) continue;
      const offered = applyCommand(advanced.state, { type: "offerNextQuest" });
      if (offered.events.some((e) => e.type === "commandRefused")) continue;
      if (!offered.state.dungeon!.nextQuestOffers!.includes(questId)) continue;
      return base;
    } catch {
      /* skip */
    }
  }
  throw new Error(`未找到 II 候选项含 ${questId} 的 Scout 种子（${start}+）`);
}

export function levelQuestIds(level: 1 | 2 | 3) {
  return basicQuests.filter((q) => q.level === level).map((q) => q.id);
}
