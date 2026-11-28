import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const dictPath = join(root, "packages/data/dictionary/icon-dictionary-v1.8.json");
const decisionsPath = join(root, "docs/handoffs/cove-icon-decisions-confirmed-2026-11-28.json");
const outputPath = join(root, "packages/data/dictionary/print-icon-additions.json");
const coveRawDir = join(root, "packages/data/extract/extension/cove/raw");

const dictionary = JSON.parse(readFileSync(dictPath, "utf8"));
const decisions = JSON.parse(readFileSync(decisionsPath, "utf8"));

const requestedIds = new Set([
  ...decisions.merge_into_existing_key.map((row) => row.iconId),
  ...decisions.remap_then_merge.map((row) => row.iconId),
  ...decisions.new_keys.map((row) => row.iconId),
]);

const occurrenceStats = new Map();
for (const iconId of requestedIds) {
  occurrenceStats.set(iconId, { cardIds: new Set(), occ: 0, categories: new Map() });
}

for (const file of readdirSync(coveRawDir).filter((name) => name.endsWith(".json"))) {
  const category = file.replace(/\.json$/, "");
  const data = JSON.parse(readFileSync(join(coveRawDir, file), "utf8"));
  for (const card of data.cards ?? []) {
    const onCard = new Set();
    for (const face of Object.values(card.faces ?? {})) {
      for (const icon of face.icons ?? []) {
        if (!occurrenceStats.has(icon.iconId)) continue;
        const stats = occurrenceStats.get(icon.iconId);
        stats.occ += 1;
        onCard.add(icon.iconId);
        stats.categories.set(category, (stats.categories.get(category) ?? 0) + 1);
      }
    }
    for (const iconId of onCard) occurrenceStats.get(iconId).cardIds.add(card.id);
  }
}

function templateForKey(key) {
  const icons = dictionary.icons.filter((icon) => icon.key === key);
  const score = (icon) =>
    icon.status === "confirmed_rulebook" ? 0 : icon.status === "confirmed" ? 1 : 2;
  return [...icons].sort((a, b) => score(a) - score(b) || a.rank - b.rank)[0];
}

const NEW_KEY_OVERRIDES = {
  room_number: {
    templateKey: "skill_number",
    meaning_en: "Room number badge (printed number)",
    meaning_zh: "房间编号牌（数字印在旁）",
    group: "room_number",
    status: "confirmed",
    kind: "other",
    value: null,
    value_in_glyph: false,
  },
  occupancy_pips_with_high_ground: {
    templateKey: "occupancy_pips",
    meaning_en: "Area occupancy pips + high ground (up triangle)",
    meaning_zh: "区域容纳标记 + 高地（向上三角）",
    group: "room_pips_high_ground",
    status: "confirmed",
    kind: "other",
    value: null,
    value_in_glyph: false,
  },
  occupancy_pips_with_high_ground_and_area_marker: {
    templateKey: "occupancy_pips_with_area_marker",
    meaning_en: "Area occupancy pips + high ground + area marker",
    meaning_zh: "区域容纳标记 + 高地 + 区域标记",
    group: "room_pips_high_ground",
    status: "confirmed",
    kind: "other",
    value: null,
    value_in_glyph: false,
  },
};

const SOURCE = "kyries_approved_proposal_2026-11-28";
const items = [
  ...decisions.merge_into_existing_key,
  ...decisions.remap_then_merge.map(({ iconId, key }) => ({ iconId, key })),
  ...decisions.new_keys,
];

if (items.length !== 98) throw new Error(`expected 98 Cove icons, got ${items.length}`);

let rank = dictionary.icons.length;
const additions = items.map(({ iconId, key, meaning_note }) => {
  rank += 1;
  const override = NEW_KEY_OVERRIDES[key];
  const template = templateForKey(override?.templateKey ?? key);
  if (!template) throw new Error(`missing template for key ${key}`);
  const stats = occurrenceStats.get(iconId);
  if (!stats || stats.occ === 0) throw new Error(`Cove extract missing iconId ${iconId}`);
  const categories = [...stats.categories.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([name, count]) => `${name}:${count}`)
    .join("; ");
  return {
    iconId,
    rank,
    card_occurrences: stats.cardIds.size,
    occurrences: stats.occ,
    status: override?.status ?? template.status,
    meaning_en: override?.meaning_en ?? template.meaning_en,
    meaning_zh: override?.meaning_zh ?? template.meaning_zh,
    kind: override?.kind ?? template.kind,
    group: override?.group ?? template.group,
    key,
    value: override ? override.value : template.value,
    value_in_glyph: override ? override.value_in_glyph : template.value_in_glyph,
    placeholder: `{icon:${iconId}}`,
    source: SOURCE,
    categories,
    notes: meaning_note ? String(meaning_note) : "Cove 印刷图标批次 2026-11-28（Kyries t16u–t20u）",
    rulebook_refs: template.rulebook_refs ?? [],
    confidence: template.confidence ?? null,
    evidence: template.evidence ?? null,
    previous_status: null,
    previous_meaning_en: null,
    proposal: null,
  };
});

const json = await prettier.format(JSON.stringify(additions), {
  ...(await prettier.resolveConfig(outputPath)),
  filepath: outputPath,
});
writeFileSync(outputPath, json, "utf8");
