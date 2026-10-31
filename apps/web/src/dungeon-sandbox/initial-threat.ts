import type { DungeonState } from "@ddbg/engine";
import { readBasicQuest } from "../../../../packages/data/src/basic-quests";

/** New Ruins campaigns only. Existing provision rolls and returning campaigns retain their logs. */
export function needsInitialThreat(d: DungeonState): boolean {
  return (
    d.phase === "awaitingProvisions" &&
    d.position === "S" &&
    (d.campaignLevel ?? 1) === 1 &&
    readBasicQuest(d.questDistribution)?.expeditionRegion === "ruins" &&
    !d.activeBossThreatScriptId &&
    !d.imminentThreatDescriptionCardId &&
    !d.startingProvisionChoices?.length &&
    !d.defeatedRuinsBossIdentities?.length &&
    !d.discardedQuests?.length &&
    !d.hamletMemory &&
    !d.hamlet
  );
}
