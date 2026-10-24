import type { FormalHeroName } from "@ddbg/engine";
import { formalHeroAssetSlug, HERO_SKILL_ICON_PUBLIC_PREFIX } from "./resolve-hero-skill-icon-art";

/** Kyries roster 头像 PNG 像素边长（1:1 显示，不在条内缩放）。 */
export const HERO_PORTRAIT_ROSTER_SIZE_PX = 85;

/** 本地 `hero/<slug>/<slug>_portrait_roster.png` 已提供的英雄（其余槽位仅占位、不请求图）。 */
export const HEROES_WITH_PORTRAIT_ROSTER = new Set<FormalHeroName>([
  "CRUSADER",
  "HELLION",
  "HIGHWAYMAN",
  "VESTAL",
]);

export function heroPortraitRosterRelPath(hero: FormalHeroName | string): string {
  const slug = formalHeroAssetSlug(hero);
  return `${slug}/${slug}_portrait_roster.png`;
}

export function heroPortraitRosterUrl(hero: FormalHeroName | string): string {
  const rel = heroPortraitRosterRelPath(hero).replace(/^\//, "");
  return `${HERO_SKILL_ICON_PUBLIC_PREFIX}/${rel}`;
}

export function heroHasPortraitRoster(hero: FormalHeroName | string): boolean {
  return HEROES_WITH_PORTRAIT_ROSTER.has(hero as FormalHeroName);
}
