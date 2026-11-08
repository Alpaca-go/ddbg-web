/** 十八名英雄 II/III 缺口停点；缺卡不得经 web 目录可购。 */
/** R-141 / R-200：核心盒与扩展 7+火枪手共 252 张高等级；保留停点表以便未来新增真实缺口。 */
export const CORE_HIGHER_SKILL_HOLDS: Readonly<Record<number, string>> = {};

export function coreHigherSkillAvailable(card: { id: string; level: number }): boolean {
  if (card.level < 2 || card.level > 3) return false;
  const core = /^hero_skill:p(\d{3})$/.exec(card.id);
  if (core) {
    const page = Number(core[1]);
    return page >= 1 && page <= 357 && !(page in CORE_HIGHER_SKILL_HOLDS);
  }
  const musketeer = /^hero_skill:musketeer:p(\d{3})$/.exec(card.id);
  if (musketeer) {
    const page = Number(musketeer[1]);
    return page >= 1 && page <= 21;
  }
  return false;
}
