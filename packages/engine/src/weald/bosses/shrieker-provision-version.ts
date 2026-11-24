import type { DungeonState } from "../../shared/dungeon/dungeon";
import { activeBossThreatMatchesDungeonLocation } from "../../core/bosses/threat-campaign";
/** R-270：显式新版本只作用于地牢中的II级描述面，不回改已掷骰／开局村庄补给。R-273：跨地点任务不生效。 */
export function shriekerSkipsProvisionRolls(d: DungeonState | undefined): boolean {
  return (
    !!d &&
    activeBossThreatMatchesDungeonLocation(d) &&
    d.shriekerProvisionSkipRolls === true &&
    d.wealdHigherBosses === true &&
    d.shriekerBossBattles === true &&
    d.campaignLevel === 2 &&
    d.contentPacks?.includes("weald") === true &&
    !d.darkest &&
    !["awaitingProvisions", "inHamlet"].includes(d.phase) &&
    d.activeBossThreatScriptId === "boss:weald:shrieker:2" &&
    d.imminentThreatDescriptionCardId === "boss_ability:weald:p002" &&
    d.bossCombatThreatCeased !== "boss:weald:shrieker:2"
  );
}
