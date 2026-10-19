import battleMap from "./battle-position-art-map.json";
import { CARD_ART_CACHE_PUBLIC_PREFIX } from "./resolve-card-art";

export type StanceSlotArtEntry = {
  readonly stance: string;
  readonly rank: number;
  readonly labelZh: string;
  readonly colorTileNick: string | null;
  readonly cacheName: string | null;
  readonly imageUrl: string | null;
};

export type HeroTokenArtEntry = {
  readonly hero: string;
  readonly ttsHero: string;
  readonly imageUrl: string;
  readonly cacheName: string;
};

const stanceById = new Map<string, StanceSlotArtEntry>(
  (battleMap.stanceSlots as StanceSlotArtEntry[]).map((e) => [e.stance, e]),
);
const heroTokenByHero = new Map<string, HeroTokenArtEntry>(
  (battleMap.heroTokens as HeroTokenArtEntry[]).map((e) => [e.hero, e]),
);

export function lookupStanceSlotArt(stance: string): StanceSlotArtEntry | undefined {
  return stanceById.get(stance);
}

export function listStanceSlotArt(): readonly StanceSlotArtEntry[] {
  return battleMap.stanceSlots as StanceSlotArtEntry[];
}

export function lookupHeroTokenArt(heroName: string): HeroTokenArtEntry | undefined {
  return heroTokenByHero.get(heroName);
}

export function cachedBattleRasterUrl(cacheName: string, ext: "png" | "jpg" = "png"): string {
  return `${CARD_ART_CACHE_PUBLIC_PREFIX}/${cacheName}.${ext}`;
}

export function battlePositionArtMapMeta(): {
  readonly schema: string;
  readonly stanceSlotCount: number;
  readonly heroTokenCount: number;
  readonly pendingConfirmation: readonly string[];
} {
  return {
    schema: battleMap.schema,
    stanceSlotCount: battleMap.stanceSlots.length,
    heroTokenCount: battleMap.heroTokens.length,
    pendingConfirmation: battleMap.pendingConfirmation,
  };
}
