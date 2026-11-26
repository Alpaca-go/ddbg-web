import rooms from "../../../../data/normalized/corebox/room.json";
import tiles from "../../../../data/normalized/corebox/room_tile_geometry.json";
import stygian from "../../../../data/normalized/corebox/stygian_rooms.json";
import stats from "../../../../data/normalized/corebox/hero_stat.json";
import {
  HERO_SKILL_BASE,
  heroSkillIdForPage,
} from "../../../../data/src/core/heroes/hero-registry";

const printPage = (page: number) => `p${String(page).padStart(3, "0")}`;
const legacySingleFaceTilePages = new Set([1, 10, 11, 12]);

// Published before #815 (STAT), #817 (rooms) and #822 (SKILL).
const aliases = new Map<string, string>([
  ...rooms.cards.map((card) => [`room:${printPage(card.source.page)}`, card.id] as const),
  ...tiles.tiles.map((card) => {
    const { page, face } = card.source;
    const suffix = face === "front" && legacySingleFaceTilePages.has(page) ? "" : `:${face}`;
    return [`room_tile:${printPage(page)}${suffix}`, card.id] as const;
  }),
  ...stygian.cards.map((card) => [`stygian_room:${printPage(card.source.page)}`, card.id] as const),
  ...stats.cards.map((card) => [`${card.rawId}:${card.face}`, card.id] as const),
  ...Array.from({ length: HERO_SKILL_BASE.MUSKETEER - 1 }, (_, index) => {
    const page = index + 1;
    return [`hero_skill:${printPage(page)}`, heroSkillIdForPage(page)] as const;
  }),
  ...Array.from(
    { length: 21 },
    (_, index) =>
      [
        `hero_skill:musketeer:${printPage(index + 1)}`,
        heroSkillIdForPage(HERO_SKILL_BASE.MUSKETEER + index),
      ] as const,
  ),
]);

function migrateId(value: string, onAlias?: () => void): string {
  // Choice IDs and room instances can embed a canonical card identity between separators.
  return value.replace(
    /(?<![\w-])(?:room:p\d{3}|room_tile:p\d{3}(?::(?:front|back))?|stygian_room:p\d{3}|hero_stat:(?:[a-z-]+:)*p\d{3}:(?:front|back)|hero_skill:(?:musketeer:)?p\d{3})(?![\w-])/g,
    (id) => {
      const replacement = aliases.get(id);
      if (replacement !== undefined) onAlias?.();
      return replacement ?? id;
    },
  );
}

/** Only a save read may interpret historical identifiers. Raw print provenance remains literal. */
export function migrateLegacyCardIds(
  value: unknown,
  skillSources: ReadonlyMap<string, unknown>,
  onAlias: () => void,
): unknown {
  if (typeof value === "string") return migrateId(value, onAlias);
  if (Array.isArray(value))
    return value.map((entry) => migrateLegacyCardIds(entry, skillSources, onAlias));
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value);
  const migrated = new Map<string, unknown>();
  for (const [key, field] of entries) {
    const nextKey = migrateId(key, onAlias);
    if (migrated.has(nextKey)) throw new Error("旧卡牌 ID 迁移产生重复键");
    migrated.set(
      nextKey,
      key === "rawId" ? field : migrateLegacyCardIds(field, skillSources, onAlias),
    );
  }
  const oldId = (value as Record<string, unknown>).id;
  if (
    typeof oldId === "string" &&
    "pages" in value &&
    "effect_lines" in value &&
    !("source" in value)
  ) {
    const newId = aliases.get(oldId);
    const source = newId && skillSources.get(newId);
    if (source) migrated.set("source", source);
  }
  return Object.fromEntries(migrated);
}
