import type { DungeonState } from "../../../dungeon";
/** R-270：显式新版本只作用于地牢中的II级描述面，不回改已掷骰／开局村庄补给。 */
export function shriekerSkipsProvisionRolls(d: DungeonState | undefined): boolean {
  return (
    !!d &&
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
