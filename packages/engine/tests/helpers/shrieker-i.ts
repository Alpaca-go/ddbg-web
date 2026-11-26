import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
import { nextExpeditionLocationDecks } from "../../src/shared/hamlet/hamlet-location-embark";
import { applyCommand, type Command, type GameState } from "../../src/shared/core/command";
import { ensureShriekerIBossScriptRegistered } from "../../src/weald/bosses/shrieker/shrieker-i";
import { SHRIEKER_I_DEPLOYMENT_ENTRY } from "../../src/weald/bosses/shrieker/shrieker-i-content";

/** 受控部署夹具，不是自然抵达或战役日志。 */
export function shriekerMechanismFixture() {
  ensureShriekerIBossScriptRegistered();
  const initial = createCoreDungeonQuest(
    0,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core", "weald"],
  );
  const d = initial.dungeon!;
  const threat = {
    campaignLevel: 1 as const,
    shriekerBossBattles: true as const,
    contentPacks: ["core", "weald"] as const,
    locationBossThreats: true as const,
    bossLocationSources: true as const,
    activeBossThreatScriptId: "boss:weald:shrieker:1" as const,
    imminentThreatDescriptionCardId: "boss_ability:weald:p001",
  };
  const objective: GameState = {
    ...initial,
    dungeon: {
      ...d,
      ...threat,
      ...nextExpeditionLocationDecks({ ...d, ...threat }, "quest:p019"),
      bossExpeditionRegion: "weald",
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        questId: "quest:p019",
        resolvedScriptId: "boss:weald:shrieker:1",
        roomPlacement: "edgeRoomsR30",
        layoutWiringHold: "明确机制夹具",
        rulesRef: ["W3", "R-261", "R-262"],
        combatEntry: SHRIEKER_I_DEPLOYMENT_ENTRY,
      },
    },
  };
  const run = (state: GameState, command: Command) => {
    const result = applyCommand(state, command);
    const error = result.events.find((e) => e.type === "commandRefused");
    if (error) throw new Error(error.message);
    return result.state;
  };
  const bound = run(objective, { type: "prepareDungeonBattle" });
  const deployed = run(bound, { type: "deployShriekerI" });
  const started = run(deployed, { type: "startBattle" });
  return { initial, bound, deployed, started };
}
