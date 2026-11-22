import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourcePath = join(root, "packages/data/dictionary/icon-dictionary-v1.8.json");
const outputPath = join(root, "packages/data/dictionary/icon-semantics-v1.json");
const dictionary = JSON.parse(readFileSync(sourcePath, "utf8"));

const countBy = (values) => {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])),
  );
};
const canonical = (values, key = "") => {
  const counts = countBy(values.filter(Boolean));
  if (!counts.length) return "";
  const [best] = counts;
  const chosen = counts
    .filter(([, count]) => count === best[1])
    .map(([value]) => value)
    .sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
  if (key.startsWith("stance_") || key.endsWith("_resist")) return chosen;
  return chosen
    .replace(/\s*(?:\u0028|\uFF08).*$/u, "")
    .replace(/\s+[\u2013\u2014-]\s+.*$/u, "")
    .trim();
};

const groups = new Map();
for (const icon of dictionary.icons) {
  if (icon.key.startsWith("unknown_") || icon.key.startsWith("pending_")) continue;
  const group = groups.get(icon.key) ?? [];
  group.push(icon);
  groups.set(icon.key, group);
}

const keys = [...groups.entries()]
  .map(([key, icons]) => {
    const sorted = [...icons].sort((a, b) => a.rank - b.rank);
    const nameEn = canonical(
      sorted.map((icon) => icon.meaning_en),
      key,
    );
    const nameZh = canonical(
      sorted.map((icon) => icon.meaning_zh),
      key,
    );
    const kind = canonical(sorted.map((icon) => icon.kind));
    const status = canonical(sorted.map((icon) => icon.status));
    const variants = [];
    const seen = new Set();
    for (const icon of sorted) {
      const signature = `${icon.meaning_en}\u0000${icon.meaning_zh}`;
      if (
        (icon.meaning_en && icon.meaning_en !== nameEn) ||
        (icon.meaning_zh && icon.meaning_zh !== nameZh)
      ) {
        if (!seen.has(signature)) {
          seen.add(signature);
          variants.push({
            iconId: icon.iconId,
            nameEn: icon.meaning_en,
            nameZh: icon.meaning_zh,
          });
        }
      }
    }
    return {
      key,
      nameEn,
      nameZh,
      kind,
      status,
      statuses: [...new Set(sorted.map((icon) => icon.status))].sort(),
      valueInGlyph: sorted.some((icon) => icon.value_in_glyph),
      aliases: sorted.map((icon) => icon.iconId),
      aliasCount: sorted.length,
      cardOccurrences: sorted.reduce((sum, icon) => sum + icon.card_occurrences, 0),
      occurrences: sorted.reduce((sum, icon) => sum + icon.occurrences, 0),
      rulebookRefs: [...new Set(sorted.flatMap((icon) => icon.rulebook_refs ?? []))].sort(),
      variants,
    };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

const output = {
  schema: "ddbg-icon-semantics-v1",
  source: "dictionary/icon-dictionary-v1.8.json",
  generated: "2026-11-22",
  keyCount: keys.length,
  aliasCount: keys.reduce((sum, entry) => sum + entry.aliasCount, 0),
  keys,
};
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath} (${output.keyCount} keys, ${output.aliasCount} aliases)`);
