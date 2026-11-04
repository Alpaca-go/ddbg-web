import type { GameState } from "../../../../packages/engine/src/command";
import { createCoreDungeonQuest } from "../../../../packages/engine/src/dungeon-quest-entry";
import { coreParty } from "../../../../packages/engine/src/test-helpers/core-quest";
import { taskSources } from "../../src/dungeon-sandbox/task-sources";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../../packages/engine/src/boss/face-the-threat-embark-runtime";

/** 显式目标房入口夹具，不声称从自然战役获得Boss任务。 */
export function prophetRoomFixture(mode: "standard" | "radiant"): GameState {
  return ruinsRoomFixture(mode, "prophet");
}

export function ruinsRoomFixture(
  mode: "standard" | "radiant",
  boss: "prophet" | "collector" | "fanatic",
): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", mode, coreParty, taskSources, true);
  const d = s.dungeon!;
  const descriptionByBoss = {
    prophet: "boss_ability:p007",
    collector: "boss_ability:p013",
    fanatic: "boss_ability:p019",
  } as const;
  const context = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: `boss:ruins:${boss}:1` as const,
    imminentThreatDescriptionCardId: descriptionByBoss[boss],
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
