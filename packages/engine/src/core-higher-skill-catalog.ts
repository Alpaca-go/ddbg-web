/** 十八名英雄 II/III 缺口停点；缺卡不得经 web 目录可购。 */
/** R-141 / R-200：核心盒与扩展 7+火枪手共 252 张高等级；保留停点表以便未来新增真实缺口。 */
export const CORE_HIGHER_SKILL_HOLDS: Readonly<Record<number, string>> = {};

export function coreHigherSkillAvailable(card: { id: string; level: number }): boolean {
  if (card.level < 2 || card.level > 3) return false;
  const canonical = /^hero_skill:(?:core|cove|warrens|weald|musketeer):h\d{2}:p(\d{3})$/.exec(
    card.id,
  );
  if (canonical) {
    const page = Number(canonical[1]);
    return page >= 1 && page <= 378 && !(page in CORE_HIGHER_SKILL_HOLDS);
  }
  return false;
}
