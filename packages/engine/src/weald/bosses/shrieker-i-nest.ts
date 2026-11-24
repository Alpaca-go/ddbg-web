import type { BattleEntity } from "../../battle";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";
import { WEALD_SHRIEKER_HIGHER_CONTENT as higher } from "./shrieker-higher-content";

const pairs = [content, ...higher.cards].map((c) => ({
  boss: c.faces[0].rawId,
  nest: c.faces[1].rawId,
}));

/** R-261：只判定 Nest 的额外禁入条件，邻接、容量和飞行由调用方另行核对。 */
export function shriekerINestAllowsEntry(
  entities: readonly BattleEntity[],
  actor: BattleEntity,
  destination: string,
): boolean {
  const pair = pairs.find((p) =>
    entities.some((e) => e.monsterCardId === p.nest && !e.dead && e.areaId === destination),
  );
  if (!pair) return true;
  const nestPresent = entities.some(
    (entity) =>
      entity.side === "monster" &&
      entity.monsterCardId === pair.nest &&
      !entity.dead &&
      entity.areaId === destination,
  );
  return !nestPresent || (actor.side === "monster" && actor.monsterCardId === pair.boss);
}

/** W3：仅返回本次击败 Shrieker 应移除的存活 Nest；不替代共用死亡／姿态清理。 */
export function shriekerINestRemovalIds(
  entities: readonly BattleEntity[],
  defeatedIds: readonly string[],
): string[] {
  return pairs.flatMap((pair) => {
    const defeated = entities.some(
      (e) =>
        e.side === "monster" &&
        e.monsterCardId === pair.boss &&
        e.dead &&
        defeatedIds.includes(e.id),
    );
    return defeated
      ? entities
          .filter((e) => e.side === "monster" && e.monsterCardId === pair.nest && !e.dead)
          .map((e) => e.id)
      : [];
  });
}
