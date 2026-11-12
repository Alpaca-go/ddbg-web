import type { BattleState } from "./battle";
import { necroticFungusBlocksHealing } from "./expansions/weald/necrotic-fungus";

/** R-067: Unholy Aura follows the hero's current area. W-04: 场上真菌时全场禁疗。 */
export function healingForbidden(battle: BattleState, heroId: string | undefined): boolean {
  if (necroticFungusBlocksHealing(battle)) return true;
  const hero = battle.entities.find((e) => e.id === heroId && e.side === "hero");
  return !!hero && battle.areas.some((a) => a.id === hero.areaId && a.healingForbidden === true);
}

export function healingForbiddenMessage(battle: BattleState): string {
  return necroticFungusBlocksHealing(battle)
    ? "Necrotic Fungus：场上有真菌时英雄不能被治疗（W-04）"
    : "Unholy Aura：技能附带治疗已阻止（R-067）";
}
