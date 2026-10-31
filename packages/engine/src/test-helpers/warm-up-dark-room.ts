import type { GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
import { createDungeonSandbox } from "../dungeon";
import { basicQuests, asQuestMapPairingQuest } from "../../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../../data/src/quest-map-pairing";

/** 明示III级任务暗房入口/补给夹具，不表示自然升幕或完整任务日志。 */
export function warmUpDarkRoomFixture(
  quest: "quest:p011" | "quest:p001" = "quest:p011",
): GameState {
  const initial = createCoreDungeonQuest(23, "quest:p001", "standard", coreParty, coreQuestSources);
  const definition = basicQuests.find((q) => q.id === quest)!;
  const game = createDungeonSandbox(
    23,
    pickEmbarkQuestMapLayout(asQuestMapPairingQuest(definition), 23, 0),
    definition.distribution,
    "standard",
    "S",
    initial.dungeon!.heroes,
    coreQuestSources.resolveCards,
    { dungeonLevel: definition.level, light: 5, provisions: [] },
    coreQuestSources.curios,
    coreQuestSources.rooms,
    coreQuestSources.monsters,
    coreQuestSources.catalog,
  );
  const d = game.dungeon!,
    position = d.rooms.find((r) => r.kind === "dark")!.id;
  return {
    ...game,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position,
      campaignLevel: quest === "quest:p011" ? 3 : 1,
      rooms: d.rooms.map((r) => (r.id === position ? { ...r, revealed: true } : r)),
      explorationSetup: {
        ...d.explorationSetup!,
        provisions: Array.from({ length: 4 }, (_, i) => ({
          id: `torch-${i}`,
          face: "torch" as const,
        })),
      },
    },
  };
}
