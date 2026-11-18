import type { BattleState } from "./battle";

/** R-255：锅内英雄仍持牌；Boil 的内部视图已把同一英雄临时放回 entities。 */
export function battleHeroCardHolders(battle: BattleState) {
  const heroes = battle.entities.filter((entity) => entity.side === "hero");
  const captive = battle.hagCauldron?.hero;
  return captive && !heroes.some((hero) => hero.id === captive.id) ? [...heroes, captive] : heroes;
}

export function battleTrinketHolders(battle: BattleState) {
  return battleHeroCardHolders(battle).map(({ id, dead, heroLevel }) => ({
    id,
    dead,
    ...(heroLevel === undefined ? {} : { level: heroLevel }),
  }));
}
