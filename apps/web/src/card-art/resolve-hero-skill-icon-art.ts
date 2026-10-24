import type { FormalHeroName } from "@ddbg/engine";

/** Kyries 提供的技能 icon 目录（gitignore）；由 Vite 插件挂载为静态 URL。 */
export const HERO_SKILL_ICON_PUBLIC_PREFIX = "/hero-skill-icons";

export function formalHeroAssetSlug(hero: FormalHeroName | string): string {
  return hero.toLowerCase().replace(/\s+/g, "_");
}

export function skillNameToIconSlug(skillName: string): string {
  return skillName
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** 例如 `crusader/crusader.smite.png` */
export function heroSkillIconRelPath(hero: FormalHeroName | string, skillName: string): string {
  const heroSlug = formalHeroAssetSlug(hero);
  const skillSlug = skillNameToIconSlug(skillName);
  return `${heroSlug}/${heroSlug}.${skillSlug}.png`;
}

export function heroSkillIconUrl(hero: FormalHeroName | string, skillName: string): string {
  const rel = heroSkillIconRelPath(hero, skillName).replace(/^\//, "");
  return `${HERO_SKILL_ICON_PUBLIC_PREFIX}/${rel}`;
}
