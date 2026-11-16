import type { BattleEntity } from "../../../battle";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";

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
