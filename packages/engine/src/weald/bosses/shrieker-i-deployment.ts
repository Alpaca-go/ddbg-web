import type { BattleEntity } from "../../shared/battle/battle";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";
import { shriekerIApprovedBattleAreas } from "./shrieker-i-geometry";

/** W3／R-261：独立部署计划；尚不授予正式战役或 startBattle 准入。 */
export function shriekerIInitialDeployment() {
  const { setup, tile } = content;
  const entities = content.faces.map((face): BattleEntity => {
    const stance = face.role === "shrieker" ? setup.shriekerStance : setup.nestStance;
    return {
      id: face.role === "shrieker" ? "boss:shrieker" : "boss:shrieker:nest",
      side: "monster",
      hero: null,
      monsterCardId: face.rawId,
      life: face.life,
      dodge: face.dodge,
      wounds: 0,
      areaId: tile.deployment.monsters[stance],
      stance,
      stanceSlots: face.stanceSlots,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      shuffleResist: face.immunities.includes("shuffle"),
    };
  });
  return {
    areas: shriekerIApprovedBattleAreas(),
    heroStanceAreas: { ...tile.deployment.heroes },
    monsterStanceAreas: { ...tile.deployment.monsters },
    entities,
    lootAreas: [...tile.deployment.lootAreas],
    initiativeCards: {
      hero: setup.heroInitiativeCards,
      monster: setup.monsterInitiativeCards,
    },
  };
}

export { shriekerINestAllowsEntry, shriekerINestRemovalIds } from "./shrieker-i-nest";
