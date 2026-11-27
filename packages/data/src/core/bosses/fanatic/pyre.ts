/** R-136，核心大型怪物 FRONT p011–013。 */
export const PYRE_CARD_IDS = [
  "monster_large:p011",
  "monster_large:p012",
  "monster_large:p013",
] as const;

export const BURN_THE_HERETIC = {
  name: "Burn the Heretic",
  slot: 1,
  target: "Closest",
  range: 0,
  heroTargets: 1,
  damage: 99,
} as const;

export function isPyreCard(id: string | undefined): boolean {
  return PYRE_CARD_IDS.some((cardId) => cardId === id);
}
