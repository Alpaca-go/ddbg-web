import type { RawFile } from "../extract/raw";
import type { IconDictionary } from "../dictionary/schema";
import { DISEASE_FRONT, DISEASE_BACK, diseaseRules, diseaseFileSchema } from "../disease";
import { createIconLookup, resolveLines, noteIcon, finishVerification } from "./icons";

export function buildDiseases(raw: RawFile, dictionary: IconDictionary) {
  if (
    raw.category !== "disease" ||
    raw.kind !== "card" ||
    raw.cards.length !== 11 ||
    raw.n_copies_total !== 11
  )
    throw new Error("完整疾病来源必须为 11 张核心盒牌");
  const lookup = createIconLookup(dictionary);
  const cards = raw.cards.map((card) => {
    const front = card.faces.front,
      back = card.faces.back;
    const entry = diseaseRules[front.page - 1];
    if (
      !entry ||
      card.source_set !== "base" ||
      card.copies !== 1 ||
      card.id !== `disease:p${String(front.page).padStart(3, "0")}` ||
      card.pages.length !== 1 ||
      card.pages[0] !== front.page ||
      front.file !== DISEASE_FRONT ||
      back?.file !== DISEASE_BACK ||
      back.page !== front.page ||
      front.lines[0]?.text !== entry.name
    )
      throw new Error("疾病卡面来源身份漂移");
    const reasons = new Set<string>();
    const lines = resolveLines(
      front.lines.map((l) => l.text),
      lookup,
      reasons,
    );
    const icons = front.icons
      .filter((i) => !i.decor)
      .map((i) => {
        const icon = lookup.resolve(i.iconId);
        noteIcon(icon, reasons);
        return icon;
      });
    return {
      id: card.id,
      name: entry.name,
      copies: card.copies,
      source: { front: front.file, back: back.file, page: front.page },
      lines,
      icons,
      verification: finishVerification(reasons),
      rule: entry.rule,
    };
  });
  return diseaseFileSchema.parse({
    schema: "ddbg-disease-v0",
    category: "disease",
    sources: {
      raw: "extract/corebox/raw/disease.json",
      dictionary: "dictionary/icon-dictionary-v1.8.json",
      rules: "DD_EN_COREBOX_RULES.pdf",
    },
    cards,
  });
}
