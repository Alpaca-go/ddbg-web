import type { BattleState } from "./battle";

/** R-067: Unholy Aura follows the hero's current area. */
export function healingForbidden(battle: BattleState, heroId: string | undefined): boolean {
  const hero = battle.entities.find((e) => e.id === heroId && e.side === "hero");
  return !!hero && battle.areas.some((a) => a.id === hero.areaId && a.healingForbidden === true);
}
