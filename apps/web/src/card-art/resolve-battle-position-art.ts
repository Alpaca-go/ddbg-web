import battleMap from "./battle-position-art-map.json";

export type HeroTokenArtEntry = {
  readonly hero: string;
  readonly ttsHero: string;
  readonly imageUrl: string;
  readonly cacheName: string;
};

const heroTokenByHero = new Map<string, HeroTokenArtEntry>(
  (battleMap.heroTokens as HeroTokenArtEntry[]).map((e) => [e.hero, e]),
);

export function lookupHeroTokenArt(heroName: string): HeroTokenArtEntry | undefined {
  return heroTokenByHero.get(heroName);
}

export function listHeroTokenArt(): readonly HeroTokenArtEntry[] {
  return battleMap.heroTokens as HeroTokenArtEntry[];
}

export function cachedBattleRasterUrl(cacheName: string, ext: "png" | "jpg" = "png"): string {
  return `/tts-card-art/${cacheName}.${ext}`;
}

export function battlePositionArtMapMeta(): {
  readonly schema: string;
  readonly heroTokenCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: battleMap.schema,
    heroTokenCount: battleMap.heroTokens.length,
    pendingConfirmation: battleMap.pendingConfirmation,
  };
}
