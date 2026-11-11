import { z } from "zod";
import type { IconDictionary } from "../dictionary/schema";
import { monsterLargeFileSchema, monsterMediumFileSchema } from "../extract/parsed";
import type { RawFile } from "../extract/raw";
import { rawFileSchema } from "../extract/raw";
import { buildMonsterLarge, buildMonsterMedium } from "./build";
import { createIconLookup } from "./icons";
import { attachVerifiedWealdMonster } from "./verified-weald-monsters";
import { normalizedMonsterMediumFileSchema, normalizedMonsterLargeFileSchema } from "./schema";

const SOURCE_ROOT = "extract/extension/weald";
const PRINT_ROOT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/";

/** 当前印刷 medium p1–14、large p1–2；只表示卡面身份，不授予战斗核准。 */
export const WEALD_LEVEL_ONE_MONSTER_IDENTITIES = [
  { id: "monster_medium:weald:p001", name: "Ectoplasm", pages: [1, 2, 3] },
  { id: "monster_medium:weald:p004", name: "Large Ectoplasm", pages: [4] },
  { id: "monster_medium:weald:p005", name: "Large Ectoplasm", pages: [5] },
  { id: "monster_medium:weald:p006", name: "Rabid Gnasher", pages: [6, 7, 8] },
  { id: "monster_medium:weald:p009", name: "Fungal Scratcher", pages: [9, 10, 11] },
  { id: "monster_medium:weald:p012", name: "Fungal Artillery", pages: [12, 13, 14] },
  { id: "monster_large:weald:p001", name: "Large Ectoplasm", pages: [1, 2] },
] as const;

const envelopeSchema = z
  .object({
    cards: z.array(z.object({ id: z.string() }).passthrough()),
  })
  .passthrough();

function selectBatch(raw: RawFile, parsed: unknown, category: "monster_medium" | "monster_large") {
  if (raw.category !== category) throw new Error("Weald 怪物类别不符");
  const stem =
    category === "monster_medium"
      ? "DD_EN_WEALD_CARDS_70_120_monsters_medium"
      : "DD_EN_WEALD_CARDS_140x140_monster_large";
  const rows = envelopeSchema.parse(parsed);
  if (rows.source !== `raw/extension/weald/${category}.json`)
    throw new Error("Weald 怪物解析来源不符");
  const identities = WEALD_LEVEL_ONE_MONSTER_IDENTITIES.filter((entry) =>
    entry.id.startsWith(`${category}:`),
  );
  const cards = identities.map((entry) => {
    const matches = raw.cards.filter((card) => card.id === entry.id);
    const extracted = rows.cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1 || extracted.length !== 1)
      throw new Error(`Weald 怪物缺失或重复：${entry.id}`);
    const card = matches[0]!;
    const row = extracted[0]!;
    if (
      card.source_set !== "extension" ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages) ||
      card.copies !== entry.pages.length ||
      card.faces.front.file !== `${PRINT_ROOT}${stem}_FRONT.pdf` ||
      card.faces.back?.file !== `${PRINT_ROOT}${stem}_BACK.pdf` ||
      card.faces.front.page !== entry.pages[0] ||
      card.faces.back.page !== entry.pages[0] ||
      row.name !== entry.name ||
      row.level !== 1 ||
      JSON.stringify(row.pages) !== JSON.stringify(entry.pages) ||
      row.copies !== card.copies ||
      !Array.isArray(row.issues) ||
      row.issues.length !== 0
    )
      throw new Error(`Weald 怪物身份、来源或解析结果不符：${entry.id}`);
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

/** R-001、R-048 / Q-186：未核准的图标、姿态与效果不填默认值，不登记生产牌堆。 */
export function buildWealdLevelOneMonsters(input: {
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
      cards: built.monster_medium.cards.map(attachVerifiedWealdMonster),
    }),
    monster_large: normalizedMonsterLargeFileSchema.parse({
      ...built.monster_large,
      cards: built.monster_large.cards.map(attachVerifiedWealdMonster),
    }),
  };
}
