import {
  cachedPrintHeroSkillUrl,
  lookupPrintHeroSkillFace,
  PRINT_CARD_ART_PUBLIC_PREFIX,
} from "../card-art/resolve-print-hero-skill-art";
import {
  cachedPrintHeroStatUrl,
  lookupPrintHeroStatFace,
} from "../card-art/resolve-print-hero-stat-art";
import printSkillMap from "../card-art/hero-skill-print-art-map.json";
import type { ReviewArtResolution, ReviewMatrixRow } from "./hero-skills-review-types";

/**
 * 扩展英雄印刷图映射仍可能使用历史 `hero_skill:art:…` id。
 * 工作台按 hero+printPage 桥接到 pngRel，不改全局词典/地图文件。
 */
type SkillArtCard = (typeof printSkillMap.cards)[number];
const skillArtByHeroPage = new Map<string, SkillArtCard>();
for (const card of printSkillMap.cards as SkillArtCard[]) {
  skillArtByHeroPage.set(`${card.hero}|${card.printPage}`, card);
}

export function resolveReviewPrintArt(row: ReviewMatrixRow): ReviewArtResolution {
  if (row.kind === "hero_stat") {
    const face = lookupPrintHeroStatFace(row.canonical_id);
    if (!face) {
      return {
        pngRel: row.png_rel,
        artMapId: row.art_map_id,
        printPage: row.print_page,
        url: row.png_rel
          ? `${PRINT_CARD_ART_PUBLIC_PREFIX}/${row.png_rel.replace(/^\//, "")}`
          : null,
        bridge: null,
        cacheProbe: "unknown",
        blocked: true,
        blockedReason: row.png_rel
          ? "print_art_cache_unavailable_or_unmapped"
          : "print_art_map_missing",
      };
    }
    return {
      pngRel: face.pngRel,
      artMapId: face.id,
      printPage: face.printPage,
      url: cachedPrintHeroStatUrl(face),
      bridge: null,
      cacheProbe: "unknown",
      blocked: false,
      blockedReason: null,
    };
  }

  const direct = lookupPrintHeroSkillFace(row.canonical_id);
  if (direct) {
    return {
      pngRel: direct.pngRel,
      artMapId: direct.id,
      printPage: direct.printPage,
      url: cachedPrintHeroSkillUrl(direct),
      bridge: null,
      cacheProbe: "unknown",
      blocked: false,
      blockedReason: null,
    };
  }

  const page = row.print_page;
  const bridged = page != null ? skillArtByHeroPage.get(`${row.hero}|${page}`) : undefined;
  if (bridged) {
    return {
      pngRel: bridged.pngRel,
      artMapId: bridged.id,
      printPage: bridged.printPage,
      url: cachedPrintHeroSkillUrl(bridged),
      bridge: "hero+printPage",
      cacheProbe: "unknown",
      blocked: false,
      blockedReason: null,
    };
  }

  if (row.png_rel) {
    return {
      pngRel: row.png_rel,
      artMapId: row.art_map_id,
      printPage: row.print_page,
      url: `${PRINT_CARD_ART_PUBLIC_PREFIX}/${row.png_rel.replace(/^\//, "")}`,
      bridge: row.art_bridge,
      cacheProbe: "unknown",
      blocked: false,
      blockedReason: null,
    };
  }

  return {
    pngRel: null,
    artMapId: null,
    printPage: row.print_page,
    url: null,
    bridge: null,
    cacheProbe: "miss",
    blocked: true,
    blockedReason: "print_art_map_missing",
  };
}

/** 图片 onError / onLoad 后更新阻断状态；缺图必须阻断语义判定。 */
export function withCacheProbe(
  art: ReviewArtResolution,
  probe: "hit" | "miss",
): ReviewArtResolution {
  if (probe === "hit") {
    return { ...art, cacheProbe: "hit", blocked: false, blockedReason: null };
  }
  return {
    ...art,
    cacheProbe: "miss",
    blocked: true,
    blockedReason: "print_art_cache_miss",
  };
}
