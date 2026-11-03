import type { GameState } from "../../../../packages/engine/src/command";
import { createCoreDungeonQuest } from "../../../../packages/engine/src/dungeon-quest-entry";
import {
  coreParty,
  coreQuestSources,
} from "../../../../packages/engine/src/test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../../packages/engine/src/boss/face-the-threat-embark-runtime";

/** 显式目标房入口夹具，不声称从自然战役获得Boss任务。 */
export function necromancerRoomFixture(mode: "standard" | "radiant"): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", mode, coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: "boss:ruins:necromancer:1" as const,
    imminentThreatDescriptionCardId: "boss_ability:p001",
  };
  return {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 1 },
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}
