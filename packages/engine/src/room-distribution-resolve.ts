import {
  randomNonObjectiveRoomKinds,
  roomDistributionSchema,
  type RoomDistribution,
} from "../../data/src/dungeon-layout";
import { createRng } from "./rng";

/** 将含 randomizeNonObjective 的模板展开为出征用完整 counts（确定性种子）。 */
export function resolveRoomDistributionForEmbark(
  distributionInput: RoomDistribution,
  seed: number,
  cursor: number,
): { distribution: RoomDistribution; cursor: number } {
  const distribution = roomDistributionSchema.parse(distributionInput);
  const n = distribution.randomizeNonObjective ?? 0;
  if (!n) return { distribution, cursor };
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  const randomCounts = new Map<RoomDistribution["counts"][number]["kind"], number>();
  const pool = randomNonObjectiveRoomKinds;
  for (let i = 0; i < n; i++) {
    const kind = pool[Math.floor(rng.next() * pool.length)]!;
    randomCounts.set(kind, (randomCounts.get(kind) ?? 0) + 1);
    nextCursor++;
  }
  const merged = new Map<RoomDistribution["counts"][number]["kind"], number>();
  for (const c of distribution.counts) merged.set(c.kind, c.count);
  for (const [kind, count] of randomCounts) merged.set(kind, (merged.get(kind) ?? 0) + count);
  return {
    distribution: {
      questId: distribution.questId,
      source: distribution.source,
      counts: [...merged.entries()].map(([kind, count]) => ({ kind, count })),
    },
    cursor: nextCursor,
  };
}
