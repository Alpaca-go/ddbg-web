import type { RawFile } from "../../shared/extract/raw";
import { finishVerification, resolveLines } from "../../shared/icons";
import type { IconLookup } from "../../shared/icons";
import { quirkPolarity } from "../../shared/quirk-polarity";
import type { NormalizedQuirkFile } from "../../shared/schema";
import { normalizedQuirkFileSchema } from "../../shared/schema";
import {
  DICTIONARY_SOURCE,
  faceIcons,
  cardStats,
  assertCardBackOnly,
  titleOf,
} from "../../shared/card-normalization";

const QUIRK_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_Quirks_FRONT.pdf";

export function buildQuirks(raw: RawFile, lookup: IconLookup): NormalizedQuirkFile {
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
