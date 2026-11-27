import type { TrinketCard, TrinketFile } from "../../shared/extract/parsed";
import type { RawFile } from "../../shared/extract/raw";
import { finishVerification, resolveLines } from "../../shared/icons";
import type { IconLookup } from "../../shared/icons";
import { FORTUNATE_ARMLET_RULE, TRINKET_RULES } from "./trinket-rules";
import {
  CORE_TRINKET_IDS,
  matchesBracerFrontStance,
  matchesCoreTrinketPrint,
  matchesFortunateArmletPrint,
} from "./core-trinket-bindings";
import type { NormalizedTrinketFile } from "../../shared/schema";
import { normalizedTrinketFileSchema } from "../../shared/schema";
import {
  DICTIONARY_SOURCE,
  rawIndex,
  requireRaw,
  faceIcons,
  cardStats,
} from "../../shared/card-normalization";

export function buildTrinkets(
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
    const rules = TRINKET_RULES.find((entry) => entry.id === card.id);
    const normalized = {
      id: card.id,
      pages: card.pages,
      copies: card.copies,
      name: card.name,
      level: card.level,
      back_level: card.back_level,
      upright_half: half(card.upright_half),
      inverted_half: half(card.inverted_half),
      ...(rules ? { rules: { useStress: rules.useStress } } : {}),
      front_icons: faceIcons(printed.faces.front.icons, lookup, reasons),
      back_icons: faceIcons(back.icons, lookup, reasons),
      issues: card.issues,
      verification: finishVerification(reasons),
    };
    const reviewedId = CORE_TRINKET_IDS.find((id) => id === card.id);
    if (
      reviewedId &&
      (!matchesCoreTrinketPrint(normalized, reviewedId) ||
        (reviewedId === "trinket:p013" && !matchesBracerFrontStance(normalized)) ||
        (reviewedId === FORTUNATE_ARMLET_RULE.id && !matchesFortunateArmletPrint(normalized)))
    )
      throw new Error(reviewedId + " 饰品效果规则与已核卡面不符（R-048）");
    return normalized;
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
