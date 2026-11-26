import type { HeroSkillCard, HeroSkillFile } from "../../shared/extract/parsed";
import type { RawFile } from "../../shared/extract/raw";
import { finishVerification, resolveLines } from "../../shared/icons";
import type { IconLookup } from "../../shared/icons";
import { heroSkillId } from "./hero-registry";
import type { NormalizedHeroSkillFile } from "../../shared/schema";
import { normalizedHeroSkillFileSchema } from "../../shared/schema";
import {
  rawIndex,
  requireRaw,
  faceIcons,
  printedLabels,
  unlabeledNumbers,
  statsLine,
  cardStats,
} from "../../shared/card-normalization";

function isDoubleFaced(
  card: HeroSkillCard,
): card is Extract<HeroSkillCard, { card_kind: "double_faced_skill" }> {
  return "card_kind" in card;
}

export function buildHeroSkills(
  parsed: HeroSkillFile,
  raw: RawFile,
  lookup: IconLookup,
  sources: NormalizedHeroSkillFile["sources"],
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
      source: { file: front.file, page: front.page },
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
    sources,
    stats: cardStats(cards),
    cards,
  });
}

/** 所有旧 ID 审批/状态接线完成后，再统一映射到 v1.1 canonical ID。 */
export function canonicalHeroSkillCards(cards: NormalizedHeroSkillFile["cards"]) {
  return cards.map((card) => {
    const page = card.pages[0]!;
    const hero = card.hero ?? "ABOMINATION";
    const globalPage = card.id.startsWith("hero_skill:musketeer:") ? 357 + page : page;
    return { ...card, id: heroSkillId(hero, globalPage) };
  });
}
