/** Core box II/III gaps; absent cards must not become purchasable through the web catalog. */
/** R-141：最后三张已逐卡确认；保留显式停点表以便未来新增真实缺口。 */
export const CORE_HIGHER_SKILL_HOLDS: Readonly<Record<number, string>> = {};

export function coreHigherSkillAvailable(card: { id: string; level: number }): boolean {
  const match = /^hero_skill:p(\d{3})$/.exec(card.id);
  if (!match || card.level < 2 || card.level > 3) return false;
  const page = Number(match[1]);
  return page >= 1 && page <= 231 && !(page in CORE_HIGHER_SKILL_HOLDS);
}
