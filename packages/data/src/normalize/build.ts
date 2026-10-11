import type { IconDictionary } from "../dictionary/schema";
import type {
  HeroSkillCard,
  HeroSkillFile,
  MonsterMediumCard,
  MonsterMediumFile,
  MonsterLargeCard,
  MonsterLargeFile,
  TrinketCard,
  TrinketFile,
} from "../extract/parsed";
import type { RawFile } from "../extract/raw";
import { createIconLookup, finishVerification, noteIcon, resolveLines, resolveText } from "./icons";
import type { IconLookup } from "./icons";
import { quirkPolarity } from "./quirk-polarity";
import { virtueRole } from "./virtue-role";
import { attachVerifiedMonsterStances } from "./verified-monster-stances";
import { attachVerifiedMonsterSpeeds } from "./verified-monster-speeds";
import { attachVerifiedMonsterStress } from "./verified-monster-stress";
import { attachVerifiedMonsterDamage } from "./verified-monster-damage";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";
import { attachVerifiedHeroRanges } from "./verified-hero-ranges";
import { attachVerifiedHeroDamage } from "./verified-hero-damage";
import { attachVerifiedHeroSupport } from "./verified-hero-support";
import { attachVerifiedHeroLayout } from "./verified-hero-layout";
import { attachVerifiedResolveTriggers } from "./verified-resolve-triggers";
import { approvedResolveLookup } from "./approved-resolve-icons";
import { buildRoomTileGeometry } from "./room-tile";
import type { RoomTileGeometryFile } from "./room-tile";
import { buildHeroStats } from "./hero-stat";
import type { NormalizedHeroStatFile } from "./hero-stat";
import type {
  NormalizedHeroSkillFile,
  NormalizedIcon,
  NormalizedMonsterLargeFile,
  NormalizedMonsterMediumFile,
  NormalizedQuirkFile,
  NormalizedTrinketFile,
  NormalizedVirtueAfflictionFile,
  Segment,
} from "./schema";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterLargeFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedQuirkFileSchema,
  normalizedTrinketFileSchema,
  normalizedVirtueAfflictionFileSchema,
} from "./schema";

const DICTIONARY_SOURCE = "dictionary/icon-dictionary-v1.8.json" as const;

const QUIRK_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_Quirks_FRONT.pdf";
const VIRTUE_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_FRONT.pdf";

type RawCard = RawFile["cards"][number];

type LabeledNumbers = {
  crit?: number | undefined;
  crit_value?: number | null | undefined;
  acc?: number | undefined;
  acc_value?: number | null | undefined;
  acc_raw?: string | undefined;
};

type ParsedUnlabeled = {
  text: string;
  left_icon?: string | undefined;
  inside_icon?: string | undefined;
};

export type NormalizedCorebox = {
  hero_stat: NormalizedHeroStatFile;
  room_tile_geometry: RoomTileGeometryFile;
  hero_skill: NormalizedHeroSkillFile;
  monster_medium: NormalizedMonsterMediumFile;
  monster_large: NormalizedMonsterLargeFile;
  trinket: NormalizedTrinketFile;
  quirk: NormalizedQuirkFile;
  virtue_affliction: NormalizedVirtueAfflictionFile;
};

export type NormalizedCoreboxInput = {
  heroStats: RawFile;
  roomTiles: RawFile;
  dictionary: IconDictionary;
  heroSkills: HeroSkillFile;
  heroSkillRaw: RawFile;
  monsterMedium: MonsterMediumFile;
  monsterMediumRaw: RawFile;
  monsterLarge: MonsterLargeFile;
  monsterLargeRaw: RawFile;
  trinkets: TrinketFile;
  trinketRaw: RawFile;
  quirks: RawFile;
  virtues: RawFile;
};

function rawIndex(file: RawFile): Map<string, RawCard> {
  return new Map(file.cards.map((card) => [card.id, card]));
}

function requireRaw(index: Map<string, RawCard>, id: string): RawCard {
  const card = index.get(id);
  if (!card) throw new Error(`raw 缺少 ${id}`);
  return card;
}

function faceIcons(
  icons: RawCard["faces"]["front"]["icons"],
  lookup: IconLookup,
  reasons: Set<string>,
): NormalizedIcon[] {
  const resolved: NormalizedIcon[] = [];
  for (const placement of icons) {
    // 提取器标了 decor 的是面板、细条、文字底板，不是待命名的游戏图标。
    if (placement.decor) continue;
    const icon = lookup.resolve(placement.iconId);
    noteIcon(icon, reasons);
    resolved.push(icon);
  }
  return resolved;
}

function integerText(text: string): number | null {
  if (!/^-?\d+$/.test(text)) return null;
  return Number(text);
}

function printedLabels(
  source: LabeledNumbers,
): { label: "Crit" | "Acc"; raw: string; value: number | null }[] {
  const labels: { label: "Crit" | "Acc"; raw: string; value: number | null }[] = [];
  if (typeof source.crit === "number") {
    labels.push({ label: "Crit", raw: `Crit ${source.crit}`, value: source.crit });
  }
  if (typeof source.acc_raw === "string") {
    labels.push({ label: "Acc", raw: source.acc_raw, value: null });
  } else if (typeof source.acc === "number") {
    labels.push({ label: "Acc", raw: `Acc ${source.acc}`, value: source.acc });
  }
  return labels;
}

/** 标签旁边的数字保持中性字段，不沿用 parsed 的 crit_value / acc_value 名字。 */
function besidePrintedLabels(source: LabeledNumbers) {
  const numbers: {
    text: string;
    numeric: number;
    anchor: { type: "printed_label"; label: "Crit" | "Acc" };
  }[] = [];
  if (typeof source.crit_value === "number") {
    numbers.push({
      text: String(source.crit_value),
      numeric: source.crit_value,
      anchor: { type: "printed_label", label: "Crit" },
    });
  }
  if (typeof source.acc_value === "number") {
    numbers.push({
      text: String(source.acc_value),
      numeric: source.acc_value,
      anchor: { type: "printed_label", label: "Acc" },
    });
  }
  return numbers;
}

function besideIcons(items: readonly ParsedUnlabeled[], lookup: IconLookup, reasons: Set<string>) {
  return items.map((item) => {
    const left = item.left_icon ? lookup.resolve(item.left_icon) : null;
    const inside = item.inside_icon ? lookup.resolve(item.inside_icon) : null;
    if (left) noteIcon(left, reasons);
    if (inside) noteIcon(inside, reasons);
    return {
      text: item.text,
      numeric: integerText(item.text),
      anchor: { type: "beside_icon" as const, left_icon: left, inside_icon: inside },
    };
  });
}

function unlabeledNumbers(
  source: LabeledNumbers & { unlabeled_numbers: readonly ParsedUnlabeled[] },
  lookup: IconLookup,
  reasons: Set<string>,
) {
  return [
    ...besidePrintedLabels(source),
    ...besideIcons(source.unlabeled_numbers, lookup, reasons),
  ];
}

function statsLine(raw: string | null, lookup: IconLookup, reasons: Set<string>): Segment[] | null {
  if (raw === null) return null;
  return resolveText(raw, lookup, reasons);
}

function cardStats<T extends { verification: { unverified: boolean } }>(cards: readonly T[]) {
  const unverified = cards.filter((card) => card.verification.unverified).length;
  return { cards: cards.length, verified: cards.length - unverified, unverified };
}

function isDoubleFaced(
  card: HeroSkillCard,
): card is Extract<HeroSkillCard, { card_kind: "double_faced_skill" }> {
  return "card_kind" in card;
}

function isLargeReference(
  card: MonsterMediumCard,
): card is Extract<MonsterMediumCard, { card_kind: "large_monster_reference" }> {
  return "card_kind" in card;
}

function buildHeroSkills(
  parsed: HeroSkillFile,
  raw: RawFile,
  lookup: IconLookup,
): NormalizedHeroSkillFile {
  const rawCards = rawIndex(raw);
  const cards = parsed.cards.map((card) => {
    const printed = requireRaw(rawCards, card.id);
    const reasons = new Set<string>();
    const front = printed.faces.front;
    const back = printed.faces.back;
    if (!back) throw new Error(`${card.id} 缺少背面`);
    const shared = {
      id: card.id,
      pages: card.pages,
      copies: card.copies,
      name: card.name,
      level: card.level,
      printed_labels: printedLabels(card),
      unlabeled_numbers: unlabeledNumbers(card, lookup, reasons),
      effect_lines: resolveLines(card.effect_lines_raw, lookup, reasons),
      top_row_icons: faceIcons(card.top_row_icons, lookup, reasons),
      name_row_icons: faceIcons(card.name_row_icons, lookup, reasons),
      stats_line: statsLine(card.stats_line_raw, lookup, reasons),
      front_icons: faceIcons(front.icons, lookup, reasons),
      back_icons: faceIcons(back.icons, lookup, reasons),
      issues: card.issues,
    };
    if (isDoubleFaced(card)) {
      return {
        ...shared,
        hero: null,
        card_kind: "double_faced_skill" as const,
        back_face_skill: {
          name: card.back_face_skill.name,
          level: card.back_face_skill.level,
          lines: resolveLines(card.back_face_skill.lines_raw, lookup, reasons),
        },
        verification: finishVerification(reasons),
      };
    }
    return {
      ...shared,
      hero: card.hero,
      back_name: card.back_name,
      back_level: card.back_level,
      verification: finishVerification(reasons),
    };
  });
  return normalizedHeroSkillFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "hero_skill",
    sources: {
      parsed: "extract/corebox/parsed/hero_skill.json",
      raw: "extract/corebox/raw/hero_skill.json",
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards,
  });
}

function monsterSkill(
  skill: {
    slot: number;
    name: string;
    target?: string | undefined;
    crit?: number | undefined;
    crit_value?: number | null | undefined;
    acc?: number | undefined;
    acc_value?: number | null | undefined;
    effect_lines_raw: readonly string[];
    lines_raw: readonly string[];
    unlabeled_numbers: readonly ParsedUnlabeled[];
  },
  lookup: IconLookup,
  reasons: Set<string>,
) {
  return {
    slot: skill.slot,
    name: skill.name,
    target: skill.target ?? null,
    printed_labels: printedLabels(skill),
    unlabeled_numbers: unlabeledNumbers(skill, lookup, reasons),
    effect_lines: resolveLines(skill.effect_lines_raw, lookup, reasons),
    lines: resolveLines(skill.lines_raw, lookup, reasons),
  };
}

function buildMonsterCard(
  card: Exclude<MonsterMediumCard, { card_kind: "large_monster_reference" }> | MonsterLargeCard,
  printed: RawCard,
  lookup: IconLookup,
) {
  const reasons = new Set<string>();
  const back = printed.faces.back;
  if (!back) throw new Error(`${card.id} 缺少背面`);
  const copyVariants = (card.copy_variants ?? []).map((variant) => {
    const icon = lookup.resolve(variant.iconId);
    noteIcon(icon, reasons);
    return { page: variant.page, face: variant.face, icon };
  });
  const lifeIcon = lookup.resolve(card.hp_icon);
  noteIcon(lifeIcon, reasons);
  for (const iconId of card.resistances_icons) noteIcon(lookup.resolve(iconId), reasons);
  for (const iconId of card.immunities_icons) noteIcon(lookup.resolve(iconId), reasons);
  return {
    id: card.id,
    pages: card.pages,
    copies: card.copies,
    name: card.name,
    level: card.level,
    type_position_raw: card.type_position_raw,
    type_position_tags: card.type_position_tags,
    copy_variants: copyVariants,
    life: card.hp,
    life_icon: lifeIcon,
    resistances: card.resistances_icons.map((iconId) => lookup.resolve(iconId)),
    immunities: card.immunities_icons.map((iconId) => lookup.resolve(iconId)),
    header_unlabeled_numbers: besideIcons(card.header_unlabeled_numbers, lookup, reasons),
    skills: card.skills.map((skill) => monsterSkill(skill, lookup, reasons)),
    footer_lines: resolveLines(card.footer_lines_raw, lookup, reasons),
    back_texts: resolveLines(card.back_texts, lookup, reasons),
    front_icons: faceIcons(printed.faces.front.icons, lookup, reasons),
    back_icons: faceIcons(back.icons, lookup, reasons),
    issues: card.issues,
    verification: finishVerification(reasons),
  };
}

function buildMonsterMedium(
  parsed: MonsterMediumFile,
  raw: RawFile,
  lookup: IconLookup,
): NormalizedMonsterMediumFile {
  const rawCards = rawIndex(raw);
  const cards = parsed.cards.map((card) => {
    const printed = requireRaw(rawCards, card.id);
    if (isLargeReference(card)) {
      const reasons = new Set<string>();
      const back = printed.faces.back;
      if (!back) throw new Error(`${card.id} 缺少背面`);
      return {
        id: card.id,
        pages: card.pages,
        copies: card.copies,
        name: card.name,
        level: card.level,
        type_position_raw: card.type_position_raw,
        type_position_tags: card.type_position_tags,
        copy_variants: [],
        card_kind: "large_monster_reference" as const,
        lines: resolveLines(card.lines_raw, lookup, reasons),
        front_icons: faceIcons(printed.faces.front.icons, lookup, reasons),
        back_icons: faceIcons(back.icons, lookup, reasons),
        issues: card.issues,
        verification: finishVerification(reasons),
      };
    }
    return buildMonsterCard(card, printed, lookup);
  });
  return normalizedMonsterMediumFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "monster_medium",
    sources: {
      parsed: "extract/corebox/parsed/monster_medium.json",
      raw: "extract/corebox/raw/monster_medium.json",
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards: attachVerifiedMonsterDamage(
      attachVerifiedMonsterStress(attachVerifiedMonsterSpeeds(attachVerifiedMonsterStances(cards))),
    ),
  });
}

function buildMonsterLarge(
  parsed: MonsterLargeFile,
  raw: RawFile,
  lookup: IconLookup,
): NormalizedMonsterLargeFile {
  const rawCards = rawIndex(raw);
  const cards = parsed.cards.map((card) =>
    buildMonsterCard(card, requireRaw(rawCards, card.id), lookup),
  );
  return normalizedMonsterLargeFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "monster_large",
    sources: {
      parsed: "extract/corebox/parsed/monster_large.json",
      raw: "extract/corebox/raw/monster_large.json",
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards,
  });
}

function buildTrinkets(
  parsed: TrinketFile,
  raw: RawFile,
  lookup: IconLookup,
): NormalizedTrinketFile {
  const rawCards = rawIndex(raw);
  const cards = parsed.cards.map((card) => {
    const printed = requireRaw(rawCards, card.id);
    const reasons = new Set<string>();
    const back = printed.faces.back;
    if (!back) throw new Error(`${card.id} 缺少背面`);
    const half = (source: TrinketCard["upright_half"]) => ({
      name: source.name,
      level: source.level,
      effect_lines: resolveLines(source.effect_lines_raw, lookup, reasons),
      printed_rotation: source.printed_rotation,
    });
    return {
      id: card.id,
      pages: card.pages,
      copies: card.copies,
      name: card.name,
      level: card.level,
      back_level: card.back_level,
      upright_half: half(card.upright_half),
      inverted_half: half(card.inverted_half),
      front_icons: faceIcons(printed.faces.front.icons, lookup, reasons),
      back_icons: faceIcons(back.icons, lookup, reasons),
      issues: card.issues,
      verification: finishVerification(reasons),
    };
  });
  return normalizedTrinketFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "trinket",
    sources: {
      parsed: "extract/corebox/parsed/trinket.json",
      raw: "extract/corebox/raw/trinket.json",
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards,
  });
}

function assertCardBackOnly(card: RawCard, frontFile: string): string {
  if (card.faces.front.file !== frontFile) {
    throw new Error(`${card.id} 的正面不是 ${frontFile}`);
  }
  const back = card.faces.back;
  if (!back) throw new Error(`${card.id} 缺少背面`);
  if (back.spans.length > 0 || back.icons.length > 0 || back.lines.length > 0) {
    throw new Error(`${card.id} 的背面有数据；BACK 文件应只是卡背`);
  }
  return back.file;
}

function titleOf(card: RawCard): string {
  const title = card.faces.front.spans[0]?.t;
  if (!title) throw new Error(`${card.id} 没有标题`);
  return title;
}

function buildQuirks(raw: RawFile, lookup: IconLookup): NormalizedQuirkFile {
  if (raw.category !== "quirk") throw new Error("quirk raw 类别不对");
  const sourceBack = raw.sources[0]?.back;
  if (!sourceBack) throw new Error("quirk 缺少 BACK 来源");
  const cards = raw.cards.map((card) => {
    const reasons = new Set<string>();
    const backFile = assertCardBackOnly(card, QUIRK_FRONT);
    const name = titleOf(card);
    const polarity = quirkPolarity(name);
    if (!polarity) reasons.add("quirk_polarity_unlisted");
    const icons = faceIcons(card.faces.front.icons, lookup, reasons);
    const lines = resolveLines(
      card.faces.front.lines.map((line) => line.text),
      lookup,
      reasons,
    );
    return {
      id: card.id,
      pages: card.pages,
      copies: card.copies,
      name,
      polarity,
      polarity_source: polarity ? ("rulebook_r26_r27" as const) : ("unverified" as const),
      source_front: QUIRK_FRONT,
      source_back: backFile,
      back_has_data: false as const,
      lines,
      icons,
      verification: finishVerification(reasons),
    };
  });
  return normalizedQuirkFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "quirk",
    sources: { parsed: null, raw: "extract/corebox/raw/quirk.json", dictionary: DICTIONARY_SOURCE },
    stats: cardStats(cards),
    cards,
  });
}

function buildVirtues(raw: RawFile, lookup: IconLookup): NormalizedVirtueAfflictionFile {
  if (raw.category !== "virtue_affliction") throw new Error("virtue_affliction raw 类别不对");
  const sourceBack = raw.sources[0]?.back;
  if (!sourceBack) throw new Error("virtue_affliction 缺少 BACK 来源");
  const cards = raw.cards.map((card) => {
    const reasons = new Set<string>();
    const backFile = assertCardBackOnly(card, VIRTUE_FRONT);
    const cardLookup = approvedResolveLookup(card.id, lookup);
    const name = titleOf(card);
    const role = virtueRole(name);
    if (!role) reasons.add("role_not_printed");
    return {
      id: card.id,
      pages: card.pages,
      copies: card.copies,
      name,
      role,
      role_source: role ? ("ruling_r053" as const) : ("unverified" as const),
      source_front: VIRTUE_FRONT,
      source_back: backFile,
      back_has_data: false as const,
      lines: resolveLines(
        card.faces.front.lines.map((line) => line.text),
        cardLookup,
        reasons,
      ),
      icons: faceIcons(card.faces.front.icons, cardLookup, reasons),
      verification: finishVerification(reasons),
    };
  });
  return normalizedVirtueAfflictionFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "virtue_affliction",
    sources: {
      parsed: null,
      raw: "extract/corebox/raw/virtue_affliction.json",
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards,
  });
}

/** 用词典 v1.8 把 parsed / raw 收成规范化卡。纯函数，不读盘。 */
export function buildNormalizedCorebox(input: NormalizedCoreboxInput): NormalizedCorebox {
  const lookup = createIconLookup(input.dictionary);
  return {
    hero_stat: buildHeroStats(input.heroStats, input.dictionary),
    hero_skill: (() => {
      const file = buildHeroSkills(input.heroSkills, input.heroSkillRaw, lookup);
      return normalizedHeroSkillFileSchema.parse({
        ...file,
        cards: attachVerifiedHeroSupport(
          attachVerifiedHeroDamage(
            attachVerifiedHeroRanges(
              attachVerifiedHeroStatuses(attachVerifiedHeroLayout(file.cards)),
            ),
          ),
        ),
      });
    })(),
    room_tile_geometry: buildRoomTileGeometry(input.roomTiles),
    monster_medium: buildMonsterMedium(input.monsterMedium, input.monsterMediumRaw, lookup),
    monster_large: buildMonsterLarge(input.monsterLarge, input.monsterLargeRaw, lookup),
    trinket: buildTrinkets(input.trinkets, input.trinketRaw, lookup),
    quirk: buildQuirks(input.quirks, lookup),
    virtue_affliction: (() => {
      const file = buildVirtues(input.virtues, lookup);
      return normalizedVirtueAfflictionFileSchema.parse({
        ...file,
        cards: attachVerifiedResolveTriggers(file.cards),
      });
    })(),
  };
}
