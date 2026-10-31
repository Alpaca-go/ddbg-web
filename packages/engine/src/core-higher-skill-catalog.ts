/** Core box II/III gaps; absent cards must not become purchasable through the web catalog. */
export const CORE_HIGHER_SKILL_HOLDS = {
  44: "Collect Bounty II: transcribed Acc 1O has no numeric threshold (R-048)",
  48: "Mark for Death III: orange icon requires card-specific approval (R-089)",
  63: "Caltrops III: orange icon requires card-specific approval (R-089)",
  218: "Absolution II: Self range and healing layout require integration",
  219: "Absolution III: Self range and healing layout require integration",
  221: "Transform II: all allies, healing/buff and reverse face require integration",
  222: "Transform III: all allies, healing/buff and reverse face require integration",
  224: "Rake II: mixed self buff/stress require integration",
  225: "Rake III: mixed self buff/stress require integration",
  227: "Rage II: positive self stress requires integration",
  228: "Rage III: positive self stress requires integration",
  230: "Slam II: mixed self/target effects require integration",
  231: "Slam III: mixed self/target effects require integration",
} as const;

export function coreHigherSkillAvailable(card: { id: string; level: number }): boolean {
  const match = /^hero_skill:p(\d{3})$/.exec(card.id);
  if (!match || card.level < 2 || card.level > 3) return false;
  const page = Number(match[1]);
  return page >= 1 && page <= 231 && !(page in CORE_HIGHER_SKILL_HOLDS);
}
