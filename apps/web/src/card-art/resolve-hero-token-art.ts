import type { FormalHeroName } from "@ddbg/engine";
import { formalHeroAssetSlug, HERO_SKILL_ICON_PUBLIC_PREFIX } from "./resolve-hero-skill-icon-art";

/** 本地 `hero/<slug>/<slug>.hero_token.png` 已提供的英雄。 */
export const HEROES_WITH_HERO_TOKEN = new Set<FormalHeroName>([
  "CRUSADER",
  "HELLION",
  "HIGHWAYMAN",
  "VESTAL",
  "PLAGUE DOCTOR",
  "OCCULTIST",
]);

export function heroHeroTokenRelPath(hero: FormalHeroName | string): string {
  const slug = formalHeroAssetSlug(hero);
  return `${slug}/${slug}.hero_token.png`;
}

export function heroHeroTokenUrl(hero: FormalHeroName | string): string {
  const rel = heroHeroTokenRelPath(hero).replace(/^\//, "");
  return `${HERO_SKILL_ICON_PUBLIC_PREFIX}/${rel}`;
}

export function heroHasHeroToken(hero: FormalHeroName | string): boolean {
  return HEROES_WITH_HERO_TOKEN.has(hero as FormalHeroName);
}
