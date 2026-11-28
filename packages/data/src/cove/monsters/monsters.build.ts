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

const SOURCE_ROOT = "extract/extension/cove";
const PRINT_ROOT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/";

/** 中型 FRONT p1–17 的 I 级普通战斗卡；仅卡面身份，不授予战斗核准或牌堆。 */
export const COVE_LEVEL_ONE_MONSTER_IDENTITIES = [
  { id: "monster_medium:cove:p001", name: "Pelagic Shaman", pages: [1, 2, 3] },
  { id: "monster_medium:cove:p004", name: "Drowned Thrall", pages: [4, 5, 6] },
  { id: "monster_medium:cove:p007", name: "Pelagic Grouper", pages: [7, 8, 9] },
  { id: "monster_medium:cove:p010", name: "Deep Stinger", pages: [10, 11, 12] },
  { id: "monster_medium:cove:p013", name: "Sea Maggot", pages: [13, 14, 15] },
  { id: "monster_medium:cove:p016", name: "Pelagic Guardian", pages: [16, 17] },
] as const;

/** I 级 Cove 印刷目录暂无编入目录的大型战斗卡；Boss／高等级留在 excluded-monsters。 */
export const COVE_LEVEL_ONE_LARGE_IDENTITIES = [] as const;

const envelopeSchema = z
  .object({
    cards: z.array(z.object({ id: z.string() }).passthrough()),
  })
  .passthrough();

function selectBatch(raw: RawFile, parsed: unknown, category: "monster_medium" | "monster_large") {
  if (raw.category !== category) throw new Error("Cove 怪物类别不符");
  const stem =
    category === "monster_medium"
      ? "DD_EN_COVE_CARDS_70_120_monsters_medium"
      : "DD_EN_COVE_CARDS_140x140_monster_large";
  const rows = envelopeSchema.parse(parsed);
  if (rows.source !== `raw/extension/cove/${category}.json`)
    throw new Error("Cove 怪物解析来源不符");
  const identities = (
    category === "monster_medium"
      ? COVE_LEVEL_ONE_MONSTER_IDENTITIES
      : COVE_LEVEL_ONE_LARGE_IDENTITIES
  ).filter((entry) => entry.id.startsWith(`${category}:`));
  const cards = identities.map((entry) => {
    const matches = raw.cards.filter((card) => card.id === entry.id);
    const extracted = rows.cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1 || extracted.length !== 1)
      throw new Error(`Cove 怪物缺失或重复：${entry.id}`);
    const card = matches[0]!;
    const row = extracted[0]!;
    if (
      card.source_set !== "extension" ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages) ||
      card.copies !== entry.pages.length ||
      card.faces.front.file !== `${PRINT_ROOT}${stem}_FRONT.pdf` ||
      card.faces.back?.file !== `${PRINT_ROOT}${stem}_BACK.pdf` ||
      card.faces.back.page !== entry.pages[0] ||
      card.faces.front.page !== entry.pages[0] ||
      row.name !== entry.name ||
      row.level !== 1 ||
      JSON.stringify(row.pages) !== JSON.stringify(entry.pages) ||
      row.copies !== card.copies ||
      !Array.isArray(row.issues) ||
      row.issues.length !== 0
    )
      throw new Error(`Cove 怪物身份、来源或解析结果不符：${entry.id}`);
    return { raw: card, parsed: row };
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

/** R-001、R-048 / Q-186：未核准图标、站姿与效果不填默认值，不登记生产牌堆。 */
export function buildCoveLevelOneMonsters(input: {
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
