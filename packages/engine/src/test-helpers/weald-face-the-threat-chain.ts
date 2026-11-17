import type { GameState } from "../command";
import { applyCommand } from "../command";
import { HAMLET_QUEST_DRAW_OPTION } from "../hamlet-location-quest-draw";

/** 明示夹具：只收束村庄准备阶段，不改金币、已完成任务记录或战役事实。 */
export function wealdChainHamletPreparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

export function wealdChainOfferNextQuest(game: GameState): {
  readonly state: GameState;
  readonly drawOptionId: string;
} {
  const offered = applyCommand(game, { type: "offerNextQuest" });
  const refused = offered.events.find((e) => e.type === "commandRefused");
  if (refused) throw new Error(refused.message);
  const pending = offered.state.dungeon!.pending;
  if (!pending?.id.startsWith("hamlet-quest-draw:")) throw new Error("II 级应进入地点抽选");
  const drawOptionId =
    pending.options.find((o) => o.id === HAMLET_QUEST_DRAW_OPTION.wealdTwo)?.id ??
    pending.options[0]!.id;
  return { state: offered.state, drawOptionId };
}
