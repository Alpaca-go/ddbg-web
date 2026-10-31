import type { DungeonState } from "./dungeon";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** 英雄本次开局常规姿态骰 + 奖励骰（R-041）；不含 Supply Run 队伍骰。 */
export function heroStartingProvisionIds(d: DungeonState, heroId: string) {
  const hero = d.heroes.find((h) => h.id === heroId);
  if (!hero?.stance || !STANCES.includes(hero.stance)) return [];
  const provisions = d.explorationSetup?.provisions ?? [];
  return provisions
    .filter(
      (p) =>
        p.id.startsWith(`dungeon-starting-provision:${hero.stance}:`) ||
        p.id.startsWith(`dungeon-bonus-provision:${heroId}:`),
    )
    .map((p) => p.id);
}
