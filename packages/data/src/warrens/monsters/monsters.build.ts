import { z } from "zod";
import type { IconDictionary } from "../../shared/dictionary/schema";
import { monsterLargeFileSchema, monsterMediumFileSchema } from "../../shared/extract/parsed";
import type { RawFile } from "../../shared/extract/raw";
import { rawFileSchema } from "../../shared/extract/raw";
import { buildMonsterLarge, buildMonsterMedium } from "../../shared/monsters/monster.build";
import { createIconLookup } from "../../shared/icons";
import { withMonsterCardRules } from "../../shared/rules";
import {
  normalizedMonsterMediumFileSchema,
  normalizedMonsterLargeFileSchema,
} from "../../shared/schema";

const SOURCE_ROOT = "extract/extension/warrens";
const PRINT_ROOT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/";

/**
 * Warrens 普通中型/大型怪物（印刷 MG_DD_04）；Boss / Wilbur / Flesh 部位 / 待印核双面卡不纳入。
 * Q-WARRENS-01：Large Carrion Eater 仅 medium p016 参考卡进 normalized，large p008 保留 raw。
 * Q-WARRENS-02：Swinetaur 仅 large p001 战斗卡进 normalized，medium p017 保留 raw。
 */
export const WARRENS_NORMAL_MONSTER_IDENTITIES = [
  { id: "monster_medium:warrens:p001", name: "Swine Chopper", pages: [1, 2, 3], level: 1 },
  { id: "monster_medium:warrens:p004", name: "Swine Slasher", pages: [4, 5, 6], level: 1 },
  { id: "monster_medium:warrens:p007", name: "Swine Wretch", pages: [7, 8, 9], level: 1 },
  { id: "monster_medium:warrens:p010", name: "Swine Drummer", pages: [10, 11, 12], level: 1 },
  { id: "monster_medium:warrens:p013", name: "Carrion Eater", pages: [13, 14, 15], level: 1 },
  {
    id: "monster_medium:warrens:p016",
    name: "Large Carrion Eater",
    pages: [16],
    level: 2,
    reference: true,
  },
  { id: "monster_medium:warrens:p018", name: "Swine Skiver", pages: [18, 19], level: 3 },
  { id: "monster_large:warrens:p001", name: "Swinetaur", pages: [1], level: 2 },
] as const;

const envelopeSchema = z
  .object({
    cards: z.array(z.object({ id: z.string() }).passthrough()),
  })
  .passthrough();

function selectBatch(raw: RawFile, parsed: unknown, category: "monster_medium" | "monster_large") {
  if (raw.category !== category) throw new Error("Warrens 怪物类别不符");
  const stem =
    category === "monster_medium"
      ? "DD_EN_WARRENS_CARDS_70_120_monsters_medium"
      : "DD_EN_WARRENS_CARDS_140x140_monster_large";
  const rows = envelopeSchema.parse(parsed);
  if (rows.source !== `raw/extension/warrens/${category}.json`)
    throw new Error("Warrens 怪物解析来源不符");
  const identities = WARRENS_NORMAL_MONSTER_IDENTITIES.filter((entry) =>
    entry.id.startsWith(`${category}:`),
  );
  const cards = identities.map((entry) => {
    const matches = raw.cards.filter((card) => card.id === entry.id);
    const extracted = rows.cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1 || extracted.length !== 1)
      throw new Error(`Warrens 怪物缺失或重复：${entry.id}`);
    const card = matches[0]!;
    const row = extracted[0]!;
    if (
      card.source_set !== "extension" ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages) ||
      card.copies !== entry.pages.length ||
      card.faces.front.file !== `${PRINT_ROOT}${stem}_FRONT.pdf` ||
      card.faces.back?.file !== `${PRINT_ROOT}${stem}_BACK.pdf` ||
      card.faces.front.page !== entry.pages[0] ||
      card.faces.back?.page !== entry.pages[0] ||
      row.name !== entry.name ||
      row.level !== entry.level ||
      JSON.stringify(row.pages) !== JSON.stringify(entry.pages) ||
      row.copies !== card.copies
    )
      throw new Error(`Warrens 怪物身份、来源或解析结果不符：${entry.id}`);
    if ("reference" in entry && entry.reference) {
      if (row.card_kind !== "large_monster_reference")
        throw new Error(`Warrens 参考卡 card_kind 不符：${entry.id}`);
    } else if (!("skills" in row) || !Array.isArray(row.skills) || row.skills.length === 0) {
      throw new Error(`Warrens 战斗卡缺技能：${entry.id}`);
    }
    return { raw: card, parsed: { ...row, issues: [] } };
  });
  const copies = cards.reduce((sum, card) => sum + card.raw.copies, 0);
  return {
    raw: rawFileSchema.parse({
      ...raw,
      n_pages: copies,
      n_copies_total: copies,
      n_unique: cards.length,
      cards: cards.map((card) => card.raw),
    }),
    parsed: {
      ...rows,
      cards: cards.map((card) => card.parsed),
      failures: [],
      stats: { cards: cards.length, ok: cards.length, failed: 0, success_rate: 1 },
    },
  };
}

/** R-001、R-048：未核准图标与战斗数值；只登记印刷身份与来源。 */
export function buildWarrensNormalMonsters(input: {
  mediumRaw: RawFile;
  largeRaw: RawFile;
  mediumParsed: unknown;
  largeParsed: unknown;
  dictionary: IconDictionary;
}) {
  const medium = selectBatch(input.mediumRaw, input.mediumParsed, "monster_medium");
  const large = selectBatch(input.largeRaw, input.largeParsed, "monster_large");
  const lookup = createIconLookup(input.dictionary);
  const built = {
    monster_medium: buildMonsterMedium(
      monsterMediumFileSchema.parse(medium.parsed),
      medium.raw,
      lookup,
      SOURCE_ROOT,
    ),
    monster_large: buildMonsterLarge(
      monsterLargeFileSchema.parse(large.parsed),
      large.raw,
      lookup,
      SOURCE_ROOT,
    ),
  };
  return {
    monster_medium: normalizedMonsterMediumFileSchema.parse({
      ...built.monster_medium,
      cards: built.monster_medium.cards.map((card) => withMonsterCardRules(card)),
    }),
    monster_large: normalizedMonsterLargeFileSchema.parse({
      ...built.monster_large,
      cards: built.monster_large.cards.map((card) => withMonsterCardRules(card)),
    }),
  };
}
