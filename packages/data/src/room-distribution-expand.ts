import {
  randomNonObjectiveRoomKinds,
  roomDistributionSchema,
  type RoomDistribution,
  type RoomTokenKind,
} from "./dungeon-layout";

/** 冲压板非 Objective 五类实体代币枚数；规则书未逐类核实，待确认时不阻塞 Q-112b（R-112）。 */
export const nonObjectiveRoomTokenPoolCopiesPerKind = 3;

export function buildNonObjectiveRoomTokenPool(
  copiesPerKind = nonObjectiveRoomTokenPoolCopiesPerKind,
): RoomTokenKind[] {
  const pool: RoomTokenKind[] = [];
  for (const kind of randomNonObjectiveRoomKinds) {
    for (let i = 0; i < copiesPerKind; i += 1) pool.push(kind);
  }
  return pool;
}

/** 从实体池无放回抽取 count 枚；randomUnit 须返回 [0, 1) 均匀数（由调用方推进 RNG 游标）。 */
export function drawRoomKindsWithoutReplacement(
  pool: readonly RoomTokenKind[],
  count: number,
  randomUnit: () => number,
): RoomTokenKind[] {
  if (count < 0 || count > pool.length) {
    throw new Error(`从实体池抽取 ${count} 枚无效（池长 ${pool.length}）`);
  }
  const work = [...pool];
  const drawn: RoomTokenKind[] = [];
  for (let k = 0; k < count; k += 1) {
    const i = Math.floor(randomUnit() * work.length);
    drawn.push(work[i]!);
    work.splice(i, 1);
  }
  return drawn;
}

function aggregateKinds(kinds: readonly RoomTokenKind[]) {
  const tally = new Map<RoomTokenKind, number>();
  for (const kind of kinds) tally.set(kind, (tally.get(kind) ?? 0) + 1);
  return [...tally.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
}

/** 将模板中的 randomizeNonObjective 槽展开为固定 counts（R-112 / Q-112b）。 */
export function materializeRoomDistribution(
  template: RoomDistribution,
  drawnNonObjective: readonly RoomTokenKind[],
): RoomDistribution {
  const need = template.randomizeNonObjective;
  if (!need) return template;
  if (drawnNonObjective.length !== need) {
    throw new Error(
      `randomizeNonObjective×${need} 需要 ${need} 枚展开结果，收到 ${drawnNonObjective.length}`,
    );
  }
  if (drawnNonObjective.some((k) => !randomNonObjectiveRoomKinds.includes(k))) {
    throw new Error("展开结果含非法房间种类（仅允许非 Objective 五类）");
  }
  const poolCap = nonObjectiveRoomTokenPoolCopiesPerKind;
  for (const kind of randomNonObjectiveRoomKinds) {
    const n = drawnNonObjective.filter((k) => k === kind).length;
    if (n > poolCap) {
      throw new Error(`展开结果 ${kind}×${n} 超过实体池容量 ${poolCap}（禁止独立匀掷 kind）`);
    }
  }
  const merged = [...template.counts];
  for (const row of aggregateKinds(drawnNonObjective)) {
    const existing = merged.find((c) => c.kind === row.kind);
    if (existing) existing.count += row.count;
    else merged.push(row);
  }
  return roomDistributionSchema.parse({
    questId: template.questId,
    source: template.source,
    counts: merged.sort((a, b) => a.kind.localeCompare(b.kind)),
  });
}

export function drawAndMaterializeRoomDistribution(
  template: RoomDistribution,
  randomUnit: () => number,
): RoomDistribution {
  const need = template.randomizeNonObjective;
  if (!need) return template;
  const pool = buildNonObjectiveRoomTokenPool();
  const drawn = drawRoomKindsWithoutReplacement(pool, need, randomUnit);
  return materializeRoomDistribution(template, drawn);
}
