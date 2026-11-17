import { applyCommand, type GameState } from "../../../../packages/engine/src/command";
import { createCoreDungeonQuest } from "../../../../packages/engine/src/dungeon-quest-entry";
import {
  coreParty,
  coreQuestSources,
} from "../../../../packages/engine/src/test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../../packages/engine/src/boss/face-the-threat-embark-runtime";
import { nextExpeditionLocationDecks } from "../../../../packages/engine/src/hamlet-location-embark";
/** 受控目标房检查点；不冒称初始战役自然抵达或人工实机验收。 */
export function higherBossUiFixture(
  identity: "hag" | "brigandPounder" | "shrieker",
  level: 2 | 3,
): GameState {
  const state = createCoreDungeonQuest(
      17,
      "quest:p019",
      "standard",
      coreParty,
      coreQuestSources,
      true,
    ),
    d = state.dungeon!;
  const description =
    identity === "hag" ? 12 + level : identity === "brigandPounder" ? 6 + level : level;
  const threat = {
    campaignLevel: level,
    wealdHigherBosses: true as const,
    pounderBossBattles: true as const,
    pounderDungeonThreats: true as const,
    pounderHamletThreats: true as const,
    shriekerBossBattles: true as const,
    contentPacks: ["core", "weald"] as const,
    activeBossThreatScriptId: `boss:weald:${identity}:${level}` as const,
    imminentThreatDescriptionCardId: `boss_ability:weald:p${String(description).padStart(3, "0")}`,
  };
  const planned = {
    ...d,
    ...threat,
    bossLocationSources: true as const,
    locationBossThreats: true as const,
    bossExpeditionRegion: "weald" as const,
    explorationSetup: { ...d.explorationSetup!, dungeonLevel: level },
    faceTheThreatEmbarkPlan: {
      ...requireFaceTheThreatEmbarkPlanForSandbox(threat),
      roomPlacement: "edgeRoomsR30" as const,
    },
  };
  const objective: GameState = {
    ...state,
    dungeon: {
      ...planned,
      ...nextExpeditionLocationDecks(planned, "quest:p019"),
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
    },
  };
  const result = applyCommand(objective, { type: "prepareDungeonBattle" });
  const refusal = result.events.find((e) => e.type === "commandRefused");
  if (refusal) throw new Error(refusal.message);
  return result.state;
}
