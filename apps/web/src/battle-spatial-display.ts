import type { BattleArea, HeroSkillCardView, SkillStance } from "@ddbg/engine";
import { heroSkillUsesSelfTarget, readPrintedRange } from "@ddbg/engine";

const ELEVATION_RANK: Record<BattleArea["elevation"], number> = {
  low: 0,
  normal: 1,
  high: 2,
};

/** 与引擎 `battle.distance` 相同：区域邻接 BFS（R-021），仅供 UI 展示。 */
export function battleAreaDistance(
  areas: readonly Pick<BattleArea, "id" | "adjacent">[],
  from: string,
  to: string,
): number | null {
  if (from === to) return 0;
  const queue: { id: string; steps: number }[] = [{ id: from, steps: 0 }];
  const seen = new Set([from]);
  for (const current of queue) {
    if (current.id === to) return current.steps;
    for (const id of areas.find((area) => area.id === current.id)?.adjacent ?? []) {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push({ id, steps: current.steps + 1 });
      }
    }
  }
  return null;
}

export type PrintedAreaRangeReach = "self" | "in" | "out" | "unknown";

/** 仅核对卡面区域距离与高低地射程上限；不判定姿态、目标类型或其它战斗条件。 */
export function printedAreaRangeReach(
  skill: HeroSkillCardView,
  actorAreaId: string,
  targetAreaId: string,
  areas: readonly Pick<BattleArea, "id" | "adjacent" | "elevation">[],
): PrintedAreaRangeReach {
  if (heroSkillUsesSelfTarget(skill)) {
    return actorAreaId === targetAreaId ? "self" : "out";
  }
  const areaDistance = battleAreaDistance(areas, actorAreaId, targetAreaId);
  if (areaDistance === null) return "unknown";
  const actorArea = areas.find((area) => area.id === actorAreaId);
  const targetArea = areas.find((area) => area.id === targetAreaId);
  if (!actorArea || !targetArea) return "unknown";
  const targetAreaLower =
    ELEVATION_RANK[actorArea.elevation] > ELEVATION_RANK[targetArea.elevation];
  const printed = readPrintedRange(skill);
  if (printed.kind === "interval") {
    const reach = printed.max + (targetAreaLower ? 1 : 0);
    return areaDistance >= printed.min && areaDistance <= reach ? "in" : "out";
  }
  if (printed.kind === "exact") {
    const reach = printed.distance + (targetAreaLower ? 1 : 0);
    return areaDistance >= printed.distance && areaDistance <= reach ? "in" : "out";
  }
  return "unknown";
}

export function printedAreaRangeReachLabel(reach: PrintedAreaRangeReach): string {
  switch (reach) {
    case "self":
      return "自身区域";
    case "in":
      return "卡面射程内";
    case "out":
      return "超出卡面射程";
    case "unknown":
      return "射程待核对";
  }
}

export const STANCE_SHORT_ZH: Record<SkillStance, string> = {
  aggressive: "进攻",
  defensive: "防御",
  ranged: "远程",
  support: "支援",
};
