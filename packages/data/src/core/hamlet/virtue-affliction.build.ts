import type { RawFile } from "../../shared/extract/raw";
import { finishVerification, resolveLines } from "../../shared/icons";
import type { IconLookup } from "../../shared/icons";
import { virtueRole } from "./virtue-role.build";
import { approvedResolveLookup } from "./approved-resolve-icons.build";
import type { NormalizedVirtueAfflictionFile } from "../../shared/schema";
import { normalizedVirtueAfflictionFileSchema } from "../../shared/schema";
import {
  DICTIONARY_SOURCE,
  faceIcons,
  cardStats,
  assertCardBackOnly,
  titleOf,
} from "../../shared/card-normalization";

const VIRTUE_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_FRONT.pdf";

export function buildVirtues(raw: RawFile, lookup: IconLookup): NormalizedVirtueAfflictionFile {
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
