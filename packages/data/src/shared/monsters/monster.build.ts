import { verifyPyrePrint } from "../../core/bosses/fanatic/pyre.build";
import { attachVerifiedCollectedLife } from "../../core/bosses/verified-collected-life.build";
import type {
  MonsterMediumCard,
  MonsterMediumFile,
  MonsterLargeCard,
  MonsterLargeFile,
} from "../extract/parsed";
import type { RawFile } from "../extract/raw";
import { finishVerification, noteIcon, resolveLines } from "../icons";
import type { IconLookup } from "../icons";
import { attachVerifiedMonsterStances } from "../../core/monsters/verified-monster-stances.build";
import { attachVerifiedMonsterSpeeds } from "../../core/monsters/verified-monster-speeds.build";
import { attachVerifiedLargeMonsterFields } from "../../core/monsters/verified-large-monster-fields.build";
import { attachVerifiedMonsterProtection } from "../../core/monsters/verified-monster-protection.build";
import { attachVerifiedMonsterEffects } from "../../core/monsters/verified-monster-effects.build";
import { attachVerifiedHeartOfDarknessSkillRanges } from "../../core/bosses/verified-heart-of-darkness-ranges.build";
import { attachVerifiedMonsterStress } from "../../core/monsters/verified-monster-stress.build";
import { attachVerifiedMonsterDamage } from "../../core/monsters/verified-monster-damage.build";
import { applyMonsterResistances } from "../../core/monsters/monster-resistances.build";
import { MONSTER_RESISTANCES } from "../../core/monsters/monster-resistances-data";
import { withMonsterCardRules } from "../rules";
import type { NormalizedMonsterLargeFile, NormalizedMonsterMediumFile } from "../schema";
import { normalizedMonsterLargeFileSchema, normalizedMonsterMediumFileSchema } from "../schema";
import type { RawCard, ParsedUnlabeled } from "../card-normalization";
import {
  DICTIONARY_SOURCE,
  rawIndex,
  requireRaw,
  faceIcons,
  printedLabels,
  besideIcons,
  unlabeledNumbers,
  cardStats,
} from "../card-normalization";

function isLargeReference(
  card: MonsterMediumCard,
): card is Extract<MonsterMediumCard, { card_kind: "large_monster_reference" }> {
  return "card_kind" in card;
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

export function buildMonsterMedium(
  parsed: MonsterMediumFile,
  raw: RawFile,
  lookup: IconLookup,
  sourceRoot:
    "extract/corebox" | "extract/extension/weald" | "extract/extension/cove" = "extract/corebox",
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
      parsed: `${sourceRoot}/parsed/monster_medium.json`,
      raw: `${sourceRoot}/raw/monster_medium.json`,
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards: applyMonsterResistances(
      (sourceRoot === "extract/corebox"
        ? attachVerifiedMonsterEffects(
            attachVerifiedMonsterDamage(
              attachVerifiedMonsterStress(
                attachVerifiedMonsterProtection(
                  attachVerifiedMonsterSpeeds(
                    attachVerifiedMonsterStances(attachVerifiedCollectedLife(cards)),
                  ),
                ),
              ),
            ),
          )
        : cards
      ).map((card) => withMonsterCardRules(card)),
      MONSTER_RESISTANCES,
    ),
  });
}

export function buildMonsterLarge(
  parsed: MonsterLargeFile,
  raw: RawFile,
  lookup: IconLookup,
  sourceRoot:
    "extract/corebox" | "extract/extension/weald" | "extract/extension/cove" = "extract/corebox",
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
      parsed: `${sourceRoot}/parsed/monster_large.json`,
      raw: `${sourceRoot}/raw/monster_large.json`,
      dictionary: DICTIONARY_SOURCE,
    },
    stats: cardStats(cards),
    cards: applyMonsterResistances(
      (sourceRoot === "extract/corebox"
        ? attachVerifiedMonsterEffects(
            attachVerifiedHeartOfDarknessSkillRanges(
              attachVerifiedMonsterProtection(
                attachVerifiedLargeMonsterFields(cards.map(verifyPyrePrint)),
                true,
              ),
            ),
            true,
          )
        : cards
      ).map((card) => withMonsterCardRules(card)),
      MONSTER_RESISTANCES,
    ),
  });
}
