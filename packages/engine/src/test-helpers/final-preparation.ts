import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";

/** 已完成最暗Boss/回村的机制夹具，不代表自然战役日志。 */
export function finalPreparationFixture(
  questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p016",
): GameState {
  const game = createCoreDungeonQuest(23, questId, "radiant", coreParty, coreQuestSources);
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      phase: "inHamlet",
      bossQuestVictory: true,
      questSummary: {
        questId,
        name: "Darkest Dungeon",
        clearedRoomIds: [],
        xpPerHero: 3,
        stagecoachXp: 3,
        awarded: true,
      },
      hamletReturn: { phase: "complete" } as NonNullable<DungeonState["hamletReturn"]>,
      hamletMemory: { deck: ["hamlet_event:p001"], permanentlyRemoved: ["hamlet_event:p004"] },
    },
  };
}
