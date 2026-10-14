import type { DungeonState } from "./dungeon";

/** R12：只在完整效果之间使用补给，不能插入待选或意志检定。 */
export function dungeonProvisionWindow(d: DungeonState): boolean {
  return (
    !d.pending &&
    !d.conditions?.incomingQuirk &&
    !d.trinkets?.incoming &&
    (d.phase === "ready" ||
      (d.phase === "returningToHamlet" && d.hamletReturn?.phase === "provisions") ||
      (d.phase === "awaitingCurio" && !!d.curio?.active))
  );
}
