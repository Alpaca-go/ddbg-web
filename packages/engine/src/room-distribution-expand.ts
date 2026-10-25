import type { RoomDistribution } from "../../data/src/dungeon-layout";
import { drawAndMaterializeRoomDistribution } from "../../data/src/room-distribution-expand";
import { createRng } from "./rng";

/** 建局：自模板展开 ? 槽（Q-112b），并推进 RNG 游标。 */
export function expandRoomDistributionForEmbark(
  template: RoomDistribution,
  seed: number,
  cursor: number,
): { distribution: RoomDistribution; cursor: number } {
  if (!template.randomizeNonObjective) return { distribution: template, cursor };
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i += 1) rng.next();
  let nextCursor = cursor;
  const distribution = drawAndMaterializeRoomDistribution(template, () => {
    nextCursor += 1;
    return rng.next();
  });
  return { distribution, cursor: nextCursor };
}
