import type { BattleEntity } from "../../../battle";
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

const shriekerCardId = content.faces.find((face) => face.role === "shrieker")!.rawId;
const nestCardId = content.faces.find((face) => face.role === "nest")!.rawId;

/** R-261：只判定 Nest 的额外禁入条件，邻接、容量和飞行由调用方另行核对。 */
export function shriekerINestAllowsEntry(
  entities: readonly BattleEntity[],
  actor: BattleEntity,
  destination: string,
): boolean {
  const nestPresent = entities.some(
    (entity) =>
      entity.side === "monster" &&
      entity.monsterCardId === nestCardId &&
      !entity.dead &&
      entity.areaId === destination,
  );
  return !nestPresent || (actor.side === "monster" && actor.monsterCardId === shriekerCardId);
}

/** W3：仅返回本次击败 Shrieker 应移除的存活 Nest；不替代共用死亡／姿态清理。 */
export function shriekerINestRemovalIds(
  entities: readonly BattleEntity[],
  defeatedIds: readonly string[],
): string[] {
  if (
    !entities.some(
      (entity) =>
        entity.side === "monster" &&
        entity.monsterCardId === shriekerCardId &&
        entity.dead &&
        defeatedIds.includes(entity.id),
    )
  )
    return [];
  return entities
    .filter(
      (entity) => entity.side === "monster" && entity.monsterCardId === nestCardId && !entity.dead,
    )
    .map((entity) => entity.id);
}
