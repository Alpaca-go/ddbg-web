import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RAW_CARD_CATEGORIES, RAW_SHEET_CATEGORIES } from "../extract/raw";
import { extractSummarySchema } from "../extract/reports";
import type { IconEntry, IconStatus } from "./schema";
import {
  ICON_STATUSES,
  iconDictionarySchema,
  iconEntrySchema,
  iconKeyConventionIssues,
} from "./schema";

const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DICT_ROOT = path.join(DATA_ROOT, "dictionary");
const RAW_ROOT = path.join(DATA_ROOT, "extract/corebox/raw");

/** `summary.json` 的 total_clusters（1713）减去词典 976 条。v1.7 另收 70 个误放进装饰切图的 id。 */
const RAW_ICON_IDS_NOT_IN_DICTIONARY = 730;

const INCONSISTENCY_IDS = [
  "hedged_confirmed_meanings",
  "damage_key",
  "occupancy_pip_count",
  "kind_vocabulary",
  "skill_number_two_groups",
  "frames_plates_as_icons",
  "art_ids_confirmed",
  "card_back_arrows",
  "stance_state_open",
  "mixed_start_box_ids",
  "start_box_ids_with_art_matches",
  "room_items_left_decor",
  "unexplained_chevron_family",
  "followup31_kept",
  "rotated_glyph_merge",
  "batch01_kept",
  "batch02_kept",
  "batch04_kept",
] as const;

/** 同一 iconId 里站位或阵营不一致，词典 key 仍用 any。rank 379 在 v1.2 改为 pending_。 */
const MIXED_START_RANKS = [127, 132, 258, 259] as const;

/** v1.2 批准的 31 条。合并行应与目标的含义、status、key、kind、value 相同。 */
const V12_MERGES = [
  [182, 3],
  [241, 105],
  [283, 364],
  [320, 5],
  [350, 124],
  [359, 142],
  [376, 105],
  [391, 340],
  [394, 152],
  [397, 4],
  [398, 22],
  [423, 306],
  [424, 65],
  [453, 215],
  [466, 401],
  [474, 221],
  [477, 340],
  [504, 364],
] as const;

const V12_DECOR = [239, 338, 351] as const;

const V12_KEPT = [195, 216, 232, 296, 307, 315, 323, 335, 379, 478] as const;

/** v1.3 batch-01：31 条并入已确认图标，6 条装饰，3 条留下。 */
const V13_MERGES = [
  [586, 412],
  [621, 229],
  [625, 73],
  [634, 17],
  [665, 334],
  [684, 255],
  [698, 385],
  [713, 226],
  [751, 255],
  [563, 275],
  [606, 318],
  [618, 360],
  [632, 257],
  [695, 444],
  [723, 231],
  [773, 173],
  [786, 311],
  [790, 334],
  [796, 226],
  [811, 173],
  [826, 56],
  [832, 493],
  [835, 333],
  [844, 148],
  [851, 197],
  [859, 234],
  [860, 75],
  [879, 169],
  [883, 260],
  [884, 333],
  [897, 250],
] as const;

const V13_DECOR = [608, 690, 709, 546, 821, 852] as const;

const V13_KEPT = [195, 216, 539] as const;

/** v1.3 batch-02：9 条并入已确认图标，3 条装饰，17 条留下。技能正背面插画不跨面合并。 */
const V13_BATCH02_MERGES = [
  [551, 250],
  [658, 487],
  [718, 344],
  [526, 89],
  [588, 38],
  [600, 106],
  [605, 57],
  [808, 44],
  [834, 254],
] as const;

const V13_BATCH02_DECOR = [566, 807, 889] as const;

const V13_BATCH02_SKILL_KEEPS = [
  528, 533, 540, 550, 555, 559, 570, 571, 591, 594, 609, 614, 617, 626, 628,
] as const;

const V13_BATCH02_OTHER_KEEPS = [714, 836] as const;

/** v1.4 batch-04：8 条并入已确认图标，7 条装饰，25 条留下。技能杂项切图不写成 skill_art。 */
const V14_MERGES = [
  [672, 355],
  [696, 106],
  [716, 89],
  [720, 487],
  [735, 27],
  [748, 36],
  [749, 26],
  [752, 35],
] as const;

const V14_DECOR = [576, 613, 635, 647, 676, 686, 753] as const;

const V14_SKILL_KEEPS = [
  527, 531, 544, 549, 553, 561, 562, 564, 569, 572, 597, 598, 599, 611, 619, 620, 636,
] as const;

const V14_OTHER_KEEPS = [603, 640, 642, 666, 668, 693, 702, 715] as const;

/** v1.5 batch-05：17 条并入已确认图标，22 条装饰。免疫栏沿用目标的 resist key。 */
const V15_MERGES = [
  [580, 1],
  [667, 368],
  [747, 179],
  [761, 412],
  [812, 250],
  [853, 415],
  [872, 25],
  [875, 15],
  [661, 352],
  [760, 352],
  [787, 27],
  [825, 36],
  [830, 26],
  [842, 288],
  [863, 35],
  [871, 346],
  [873, 25],
] as const;

const V15_DECOR = [
  535, 664, 688, 694, 697, 703, 710, 740, 763, 766, 777, 794, 797, 806, 816, 837, 841, 843, 862,
  891, 899, 905,
] as const;

/** v1.6 batch-06：1 条旋转 180° 并入食物，20 条装饰，13 条外观占位。 */
const V16_MERGE = [833, 240] as const;

const V16_DECOR = [
  534, 755, 764, 765, 778, 779, 780, 788, 815, 822, 823, 836, 840, 866, 867, 877, 888, 898, 900,
  903,
] as const;

const V16_KEEPS = [687, 726, 731, 746, 775, 793, 799, 800, 809, 831, 845, 855, 868] as const;

/** v1.7 batch-07：70 个原先不在词典里的 id。合并 3、归类 64、留下 3。 */
const V17_MERGES = [
  [907, 21],
  [908, 255],
  [909, 211],
] as const;

const V17_KEEPS = [910, 911, 912] as const;

const V17_KEEP_MEANING: Record<number, string> = {
  910: 'Unconfirmed glyph: ten-sided die showing 10, with a large "1" beside it',
  911: 'Unconfirmed glyph: ten-sided die showing 10, with a large "10" beside it',
  912: "Unconfirmed glyph: yellow cracked human figure",
};

const V17_CATEGORIZE = Array.from({ length: 64 }, (_, index) => 913 + index);

/** v1.8 batch-08：79 条归入已有 skill_art。不是 merge。r195、r544、r569 留下。 */
const V18_CATEGORIZE = [
  527, 528, 530, 531, 532, 533, 536, 537, 538, 539, 540, 541, 542, 543, 545, 547, 549, 550, 552,
  553, 554, 555, 556, 557, 559, 560, 561, 562, 564, 565, 567, 568, 570, 571, 572, 573, 574, 575,
  577, 578, 579, 581, 582, 583, 584, 585, 587, 590, 591, 592, 593, 594, 596, 597, 598, 599, 601,
  602, 604, 607, 609, 611, 612, 614, 615, 616, 617, 619, 620, 622, 624, 626, 627, 628, 629, 630,
  633, 636, 638,
] as const;

const V18_KEEPS = [195, 544, 569] as const;

const V18_CATEGORIZE_SET = new Set<number>(V18_CATEGORIZE);

const V16_KEEP_MEANING: Record<number, string> = {
  687: "Unconfirmed glyph: red right arrow (d10 result table)",
  726: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
  731: "Unconfirmed glyph: two black-heart red-glow squares",
  746: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
  775: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
  793: "Unconfirmed glyph: heart with a black fill and a red border",
  799: 'Unconfirmed glyph: grey "-2" value badge',
  800: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
  809: "Unconfirmed glyph: red pot or puddle glyph",
  831: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
  845: 'Unconfirmed glyph: grey "+2" value badge',
  855: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
  868: "Unconfirmed glyph: orange diagonal stroke (one stroke of a comparison mark)",
};

const START_KEY = /^start_(hero|monster|any)_(support|ranged|defensive|aggressive|any)$/;
const PLACEMENT_CLASS = /^(hero|monster)_(support|ranged|defensive|aggressive)$/;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(DICT_ROOT, relativePath), "utf8")) as unknown;
}

function parseSchema<T>(
  schema: {
    safeParse: (
      data: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
  },
  data: unknown,
  label: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const preview = result.error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`${label}\n${preview}`);
  }
  return result.data;
}

function parseCsv(text: string): string[][] {
  const source = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell !== "")) rows.push(row);
  }
  return rows;
}

function column(header: string[], name: string): number {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`CSV 缺少列 ${name}`);
  return index;
}

function statusCounts(icons: readonly IconEntry[]): Record<IconStatus, number> {
  const counts = Object.fromEntries(ICON_STATUSES.map((status) => [status, 0])) as Record<
    IconStatus,
    number
  >;
  for (const icon of icons) counts[icon.status] += 1;
  return counts;
}

function sum(icons: readonly IconEntry[], pick: (icon: IconEntry) => number): number {
  return icons.reduce((total, icon) => total + pick(icon), 0);
}

function rawIconIds(): Set<string> {
  const ids = new Set<string>();
  const pattern = /"iconId": "([0-9a-f]{10})"/g;
  for (const name of readdirSync(RAW_ROOT)) {
    if (!name.endsWith(".json")) continue;
    const text = readFileSync(path.join(RAW_ROOT, name), "utf8");
    for (const match of text.matchAll(pattern)) {
      const iconId = match[1];
      if (iconId) ids.add(iconId);
    }
  }
  return ids;
}

const dictionary = parseSchema(
  iconDictionarySchema,
  readJson("icon-dictionary-v1.8.json"),
  "icon-dictionary-v1.8",
);

describe("图标词典 v1.8", () => {
  it("通过 schema，共 983 条（Q-60 新收 7 条，旧 rank 不变）", () => {
    expect(dictionary.meta.version).toBe("1.8");
    expect(dictionary.icons).toHaveLength(983);
    expect(dictionary.inconsistencies.map((item) => item.id)).toEqual([...INCONSISTENCY_IDS]);
    const ranks = new Set(dictionary.icons.map((icon) => icon.rank));
    for (const item of dictionary.inconsistencies) {
      expect(item.ranks.every((rank) => ranks.has(rank))).toBe(true);
    }
  });

  it("status 计数与文件内 stats 一致", () => {
    const stats = dictionary.meta.stats;
    expect(statusCounts(dictionary.icons)).toEqual(stats.status_all976);
    expect(statusCounts(dictionary.icons.filter((icon) => icon.rank <= 525))).toEqual(
      stats.status_top525,
    );
    expect(sum(dictionary.icons, (icon) => icon.card_occurrences)).toBe(
      stats.total_card_occurrences,
    );
    expect(sum(dictionary.icons, (icon) => icon.occurrences)).toBe(stats.total_occurrences);
    expect(
      sum(
        dictionary.icons.filter((icon) => icon.rank <= 525),
        (icon) => icon.card_occurrences,
      ),
    ).toBe(stats.top525_card_occurrences);

    const settled = new Set<IconStatus>(["confirmed", "confirmed_rulebook", "decor"]);
    expect(
      sum(
        dictionary.icons.filter((icon) => settled.has(icon.status)),
        (icon) => icon.card_occurrences,
      ),
    ).toBe(stats.coverage_all976_confirmed_rulebook_decor.card_occurrences);
    expect(
      sum(
        dictionary.icons.filter((icon) => settled.has(icon.status)),
        (icon) => icon.occurrences,
      ),
    ).toBe(stats.coverage_all976_confirmed_rulebook_decor.occurrences);
  });

  it("unreviewed 与 unsure 没有含义", () => {
    const unnamed = dictionary.icons.filter(
      (icon) => icon.status === "unreviewed" || icon.status === "unsure",
    );
    expect(unnamed.length).toBeGreaterThan(0);
    for (const icon of unnamed) {
      expect(icon.meaning_en).toBe("");
      expect(icon.meaning_zh).toBe("");
      expect(icon.kind).toBe("");
      expect(icon.key).toBe(`unknown_${icon.iconId}`);
    }

    const sample = unnamed[0];
    expect(sample).toBeDefined();
    if (!sample) return;
    const unsureWithMeaning = {
      ...sample,
      status: "unsure" as const,
      meaning_en: "guess",
      meaning_zh: "猜测",
    };
    expect(iconEntrySchema.safeParse(unsureWithMeaning).success).toBe(false);
    expect(iconEntrySchema.safeParse({ ...sample, meaning_en: "guess" }).success).toBe(false);
  });

  it("key 符合命名约定", () => {
    const issues = dictionary.icons.flatMap((icon) =>
      iconKeyConventionIssues(icon).map((issue) => `rank ${icon.rank}: ${issue}`),
    );
    expect(issues).toEqual([]);
  });

  it("CSV 与 JSON 是同一份表", () => {
    const rows = parseCsv(readFileSync(path.join(DICT_ROOT, "icon-dictionary-v1.8.csv"), "utf8"));
    const header = rows[0];
    expect(header).toBeDefined();
    if (!header) return;
    const idCol = column(header, "iconId");
    const rankCol = column(header, "rank");
    const statusCol = column(header, "status");
    const keyCol = column(header, "key");
    const enCol = column(header, "meaning_en");
    const zhCol = column(header, "meaning_zh");
    const kindCol = column(header, "kind");
    const valueCol = column(header, "value");
    const glyphCol = column(header, "value_in_glyph");
    const refsCol = column(header, "rulebook_refs");
    const byId = new Map(rows.slice(1).map((row) => [row[idCol] ?? "", row]));
    expect(byId.size).toBe(dictionary.icons.length);
    for (const icon of dictionary.icons) {
      const row = byId.get(icon.iconId);
      expect(row, icon.iconId).toBeDefined();
      if (!row) continue;
      expect(Number(row[rankCol])).toBe(icon.rank);
      expect(row[statusCol]).toBe(icon.status);
      expect(row[keyCol]).toBe(icon.key);
      expect(row[enCol]).toBe(icon.meaning_en);
      expect(row[zhCol]).toBe(icon.meaning_zh);
      expect(row[kindCol]).toBe(icon.kind);
      expect(row[valueCol] === "" ? null : Number(row[valueCol])).toBe(icon.value);
      expect(row[glyphCol] === "True").toBe(icon.value_in_glyph);
      expect(row[refsCol]).toBe(icon.rulebook_refs.join(" || "));
    }
  });

  it("词典文件不含 Musketeer", () => {
    for (const name of readdirSync(DICT_ROOT)) {
      if (name === "README.md") continue;
      const text = readFileSync(path.join(DICT_ROOT, name), "utf8");
      expect(text.toLowerCase()).not.toContain("musketeer");
    }
  });

  it("v1.2 的 31 条：合并行沿用目标含义，留下的行用 pending_ key", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([
      ...V12_MERGES.map(([rank]) => rank),
      ...V12_DECOR,
      ...V12_KEPT,
    ]);
    expect(touched.size).toBe(31);

    for (const [rank, targetRank] of V12_MERGES) {
      const icon = byRank.get(rank);
      const target = byRank.get(targetRank);
      expect(icon, `rank ${rank}`).toBeDefined();
      expect(target, `rank ${targetRank}`).toBeDefined();
      if (!icon || !target) continue;
      expect(icon.status).toBe(target.status);
      expect(icon.meaning_en).toBe(target.meaning_en);
      expect(icon.meaning_zh).toBe(target.meaning_zh);
      expect(icon.kind).toBe(target.kind);
      expect(icon.key).toBe(target.key);
      expect(icon.value).toBe(target.value);
      expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.notes).toContain(`merged_into=${target.iconId}`);
    }

    for (const rank of V12_DECOR) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("decor");
      expect(icon?.key).toBe("decor");
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
    }

    for (const rank of V12_KEPT.filter((rank) => rank !== 296)) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("needs_review");
      expect(icon?.key).toBe(`pending_${icon?.iconId}`);
      expect(icon?.kind).toBe("");
      expect(icon?.proposal).not.toBeNull();
      expect(icon?.source).toBe("followup_proposal_2026-10-07");
    }

    const text = readFileSync(path.join(DICT_ROOT, "icon-dictionary-v1.8.json"), "utf8");
    expect(text).not.toContain("DRAFT");
    expect(text).not.toContain("pending Kyries");
    expect(text).not.toContain("do not commit");
  });

  it("v1.3 batch-01 的 40 条：合并沿用目标，装饰为 decor，留下的仍是 pending_", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([
      ...V13_MERGES.map(([rank]) => rank),
      ...V13_DECOR,
      ...V13_KEPT,
    ]);
    expect(touched.size).toBe(40);
    expect(dictionary.meta.resolved_in_v1_3.length).toBeGreaterThan(0);

    for (const [rank, targetRank] of V13_MERGES) {
      const icon = byRank.get(rank);
      const target = byRank.get(targetRank);
      expect(icon, `rank ${rank}`).toBeDefined();
      expect(target, `rank ${targetRank}`).toBeDefined();
      if (!icon || !target) continue;
      expect(icon.status).toBe(target.status);
      expect(icon.status).toBe("confirmed");
      expect(icon.meaning_en).toBe(target.meaning_en);
      expect(icon.meaning_zh).toBe(target.meaning_zh);
      expect(icon.kind).toBe(target.kind);
      expect(icon.key).toBe(target.key);
      expect(icon.value).toBe(target.value);
      expect(icon.value_in_glyph).toBe(target.value_in_glyph);
      expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.notes).toContain(`merged_into=${target.iconId}`);
      expect(icon.previous_status).toBe("unreviewed");
      expect(icon.proposal).toBeNull();
    }

    for (const rank of V13_DECOR) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("decor");
      expect(icon?.key).toBe("decor");
      expect(icon?.kind).toBe("decor");
      expect(icon?.meaning_en).toBe("Decor / not an icon");
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon?.previous_status).toBe("unreviewed");
    }

    for (const rank of [195, 216] as const) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("needs_review");
      expect(icon?.key).toBe(`pending_${icon?.iconId}`);
      expect(icon?.kind).toBe("");
      expect(icon?.source).toBe("followup_proposal_2026-10-07");
      expect(icon?.notes).toContain(
        "v1.3 (Kyries approved batch-01 2026-10-07): kept as needs_review",
      );
    }

    // r539 在 batch-01 留下。v1.8 batch-08 归入 skill_art，不是 merge_into r490。
    const keptArt = byRank.get(539);
    expect(keptArt?.status).toBe("confirmed");
    expect(keptArt?.key).toBe("skill_art");
    expect(keptArt?.meaning_en).toBe("Skill picture");
    expect(keptArt?.notes).toContain("Not merge_into r490");
    expect(keptArt?.notes).not.toContain("merged_into");
    expect(keptArt?.previous_meaning_en).toBe(
      "Unconfirmed glyph: illustration after the hero name on a skill-card back",
    );
  });

  it("v1.3 batch-02：合并沿用目标，技能正背面插画各自留下", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([
      ...V13_BATCH02_MERGES.map(([rank]) => rank),
      ...V13_BATCH02_DECOR,
      ...V13_BATCH02_SKILL_KEEPS,
      ...V13_BATCH02_OTHER_KEEPS,
    ]);
    expect(touched.size).toBe(29);

    for (const [rank, targetRank] of V13_BATCH02_MERGES) {
      const icon = byRank.get(rank);
      const target = byRank.get(targetRank);
      expect(icon, `rank ${rank}`).toBeDefined();
      expect(target, `rank ${targetRank}`).toBeDefined();
      if (!icon || !target) continue;
      expect(icon.status).toBe("confirmed");
      expect(icon.status).toBe(target.status);
      expect(icon.meaning_en).toBe(target.meaning_en);
      expect(icon.meaning_zh).toBe(target.meaning_zh);
      expect(icon.kind).toBe(target.kind);
      expect(icon.key).toBe(target.key);
      expect(icon.value).toBe(target.value);
      expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.notes).toContain(`merged_into=${target.iconId}`);
      expect(icon.notes).toContain("batch-02");
    }

    for (const rank of V13_BATCH02_DECOR) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("decor");
      expect(icon?.key).toBe("decor");
      expect(icon?.kind).toBe("decor");
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
    }

    for (const rank of V13_BATCH02_SKILL_KEEPS) {
      const icon = byRank.get(rank);
      // v1.8 batch-08 归入已有 skill_art，通用含义，不是并入对面。
      expect(V18_CATEGORIZE).toContain(rank);
      expect(icon?.status).toBe("confirmed");
      expect(icon?.key).toBe("skill_art");
      expect(icon?.kind).toBe("other");
      expect(icon?.meaning_en).toBe("Skill picture");
      expect(icon?.meaning_zh).toBe("技能插画");
      expect(icon?.value).toBeNull();
      expect(icon?.value_in_glyph).toBe(false);
      expect(icon?.notes).not.toContain("merged_into");
      expect(icon?.previous_status).toBe("needs_review");
      expect(icon?.previous_meaning_en?.startsWith("Unconfirmed glyph: skill-card ")).toBe(true);
    }

    for (const rank of V13_BATCH02_OTHER_KEEPS) {
      const icon = byRank.get(rank);
      // r836 在 v1.6 batch-06 改成装饰。batch-02 当时留下的另外一条仍是 pending_。
      if (rank === 836) continue;
      expect(icon?.status).toBe("needs_review");
      expect(icon?.key).toBe(`pending_${icon?.iconId}`);
      expect(icon?.kind).toBe("");
      expect(icon?.proposal).toBeNull();
    }
  });

  it("v1.4 batch-04：合并沿用目标，装饰为 decor，留下的仍是 pending_", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([
      ...V14_MERGES.map(([rank]) => rank),
      ...V14_DECOR,
      ...V14_SKILL_KEEPS,
      ...V14_OTHER_KEEPS,
    ]);
    expect(touched.size).toBe(40);
    expect(dictionary.meta.resolved_in_v1_4.length).toBeGreaterThan(0);

    for (const [rank, targetRank] of V14_MERGES) {
      const icon = byRank.get(rank);
      const target = byRank.get(targetRank);
      expect(icon, `rank ${rank}`).toBeDefined();
      expect(target, `rank ${targetRank}`).toBeDefined();
      if (!icon || !target) continue;
      expect(icon.status).toBe("confirmed");
      expect(icon.status).toBe(target.status);
      expect(icon.meaning_en).toBe(target.meaning_en);
      expect(icon.meaning_zh).toBe(target.meaning_zh);
      expect(icon.kind).toBe(target.kind);
      expect(icon.key).toBe(target.key);
      expect(icon.value).toBe(target.value);
      expect(icon.value_in_glyph).toBe(target.value_in_glyph);
      expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.notes).toContain(`merged_into=${target.iconId}`);
      expect(icon.notes).toContain("batch-04");
      expect(icon.previous_status).toBe("unreviewed");
      expect(icon.previous_meaning_en).toBeNull();
      expect(icon.proposal).toBeNull();
    }

    const ranged = byRank.get(735);
    expect(ranged?.key).toBe("stance_ranged_lit");
    expect(ranged?.group).toBe("stance_ranged");

    for (const rank of V14_DECOR) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("decor");
      expect(icon?.key).toBe("decor");
      expect(icon?.kind).toBe("decor");
      expect(icon?.meaning_en).toBe("Decor / not an icon");
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon?.previous_status).toBe("unreviewed");
    }

    const skillMeanings = new Set<string>();
    const stillKept: number[] = [];
    for (const rank of V14_SKILL_KEEPS) {
      const icon = byRank.get(rank);
      if (rank === 544) continue; // 2026-10-11 Wound 补充批准
      if (V18_CATEGORIZE_SET.has(rank)) {
        // v1.8 batch-08 归入 skill_art。r544、r569 不在这批里。
        expect(icon?.status).toBe("confirmed");
        expect(icon?.key).toBe("skill_art");
        expect(icon?.meaning_en).toBe("Skill picture");
        expect(icon?.notes).not.toContain("merged_into");
        continue;
      }
      stillKept.push(rank);
      expect(icon?.status).toBe("needs_review");
      expect(icon?.key).toBe(`pending_${icon?.iconId}`);
      expect(icon?.key).not.toBe("skill_art");
      expect(icon?.kind).toBe("");
      expect(icon?.proposal).toBeNull();
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon?.previous_status).toBe("unreviewed");
      expect(icon?.meaning_en.startsWith("Unconfirmed glyph: skill-card ")).toBe(true);
      expect(
        icon?.meaning_en.includes("front crop") || icon?.meaning_en.includes("back crop"),
      ).toBe(true);
      skillMeanings.add(icon?.meaning_en ?? "");
    }
    expect(stillKept).toEqual([569]);
    expect(skillMeanings.size).toBe(1);

    for (const rank of V14_OTHER_KEEPS.filter((rank) => ![668, 693].includes(rank))) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("needs_review");
      expect(icon?.key).toBe(`pending_${icon?.iconId}`);
      expect(icon?.kind).toBe("");
      expect(icon?.proposal).toBeNull();
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon?.meaning_en.startsWith("Unconfirmed glyph:")).toBe(true);
    }
  });

  it("v1.5 batch-05：合并沿用目标（含 resist key），装饰为 decor", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([...V15_MERGES.map(([rank]) => rank), ...V15_DECOR]);
    expect(touched.size).toBe(39);
    expect(dictionary.meta.resolved_in_v1_5.length).toBeGreaterThan(0);

    for (const [rank, targetRank] of V15_MERGES) {
      const icon = byRank.get(rank);
      const target = byRank.get(targetRank);
      expect(icon, `rank ${rank}`).toBeDefined();
      expect(target, `rank ${targetRank}`).toBeDefined();
      if (!icon || !target) continue;
      expect(icon.status).toBe("confirmed");
      expect(icon.status).toBe(target.status);
      expect(icon.meaning_en).toBe(target.meaning_en);
      expect(icon.meaning_zh).toBe(target.meaning_zh);
      expect(icon.kind).toBe(target.kind);
      expect(icon.key).toBe(target.key);
      expect(icon.value).toBe(target.value);
      expect(icon.value_in_glyph).toBe(target.value_in_glyph);
      expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.notes).toContain(`merged_into=${target.iconId}`);
      expect(icon.notes).toContain("batch-05");
      expect(icon.previous_status).toBe("unreviewed");
      expect(icon.previous_meaning_en).toBeNull();
      expect(icon.proposal).toBeNull();
    }

    const debuffResist = byRank.get(761);
    expect(debuffResist?.key).toBe("debuff_resist");
    expect(debuffResist?.kind).toBe("resist");
    expect(debuffResist?.group).toBe("debuff");

    const bleedResist = byRank.get(812);
    expect(bleedResist?.key).toBe("bleed_resist");
    expect(bleedResist?.kind).toBe("resist");
    expect(bleedResist?.group).toBe("bleed");

    const light = byRank.get(871);
    const lightTarget = byRank.get(346);
    expect(light?.meaning_en).toBe(lightTarget?.meaning_en);
    expect(light?.meaning_en).toContain("possibly");
    expect(light?.group).toBe("g_c4fa19b2");

    const stackedHeal = byRank.get(873);
    expect(stackedHeal?.key).toBe("heal");
    expect(stackedHeal?.value).toBeNull();
    expect(stackedHeal?.value_in_glyph).toBe(false);

    const ranged = byRank.get(787);
    expect(ranged?.key).toBe("stance_ranged_lit");
    expect(ranged?.group).toBe("g_3e15d1ef");

    for (const rank of V15_DECOR) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("decor");
      expect(icon?.key).toBe("decor");
      expect(icon?.kind).toBe("decor");
      expect(icon?.meaning_en).toBe("Decor / not an icon");
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon?.previous_status).toBe("unreviewed");
      expect(icon?.notes).toContain("batch-05");
    }
  });

  it("v1.6 batch-06：旋转食物并入 r240，装饰为 decor，留下的仍是 pending_", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([V16_MERGE[0], ...V16_DECOR, ...V16_KEEPS]);
    expect(touched.size).toBe(34);
    expect(dictionary.meta.resolved_in_v1_6.length).toBeGreaterThan(0);

    const icon = byRank.get(V16_MERGE[0]);
    const target = byRank.get(V16_MERGE[1]);
    expect(icon).toBeDefined();
    expect(target).toBeDefined();
    if (!icon || !target) return;
    expect(icon.status).toBe("confirmed");
    expect(icon.status).toBe(target.status);
    expect(icon.meaning_en).toBe(target.meaning_en);
    expect(icon.meaning_zh).toBe(target.meaning_zh);
    expect(icon.kind).toBe(target.kind);
    expect(icon.key).toBe("food");
    expect(icon.key).toBe(target.key);
    expect(icon.value).toBe(target.value);
    expect(icon.value_in_glyph).toBe(target.value_in_glyph);
    expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
    expect(icon.group).toBe("food");
    expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
    expect(icon.notes).toContain(`merged_into=${target.iconId}`);
    expect(icon.notes).toContain("batch-06");
    expect(icon.evidence).toContain("旋转 180°");
    expect(icon.previous_status).toBe("unreviewed");
    expect(icon.previous_meaning_en).toBeNull();
    expect(icon.proposal).toBeNull();

    for (const rank of V16_DECOR) {
      const decor = byRank.get(rank);
      expect(decor?.status).toBe("decor");
      expect(decor?.key).toBe("decor");
      expect(decor?.kind).toBe("decor");
      expect(decor?.meaning_en).toBe("Decor / not an icon");
      expect(decor?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(decor?.notes).toContain("batch-06");
      if (rank === 836) {
        expect(decor?.previous_status).toBe("needs_review");
        expect(decor?.previous_meaning_en).toBe("Unconfirmed glyph: grey irregular fragment");
      } else {
        expect(decor?.previous_status).toBe("unreviewed");
        expect(decor?.previous_meaning_en).toBeNull();
      }
    }

    for (const rank of V16_KEEPS.filter((rank) => ![731, 793].includes(rank))) {
      const kept = byRank.get(rank);
      expect(kept?.status).toBe("needs_review");
      expect(kept?.key).toBe(`pending_${kept?.iconId}`);
      expect(kept?.kind).toBe("");
      expect(kept?.proposal).toBeNull();
      expect(kept?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(kept?.previous_status).toBe("unreviewed");
      expect(kept?.meaning_en).toBe(V16_KEEP_MEANING[rank]);
      expect(kept?.meaning_zh.startsWith("待确认图形：")).toBe(true);
    }

    const pot = byRank.get(809);
    expect(pot?.key).toBe("pending_66254314c8");
    expect(pot?.group).toBe("stress");
  });

  it("v1.7 batch-07：新 rank 907-976，合并沿用目标，饰品插图不并入 r468，留下的仍是 pending_", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    const touched = new Set<number>([
      ...V17_MERGES.map(([rank]) => rank),
      ...V17_KEEPS,
      ...V17_CATEGORIZE,
    ]);
    expect(touched.size).toBe(70);
    expect(Math.min(...touched)).toBe(907);
    expect(Math.max(...touched)).toBe(976);
    expect(dictionary.meta.resolved_in_v1_7.length).toBeGreaterThan(0);

    const picture = byRank.get(468);
    expect(picture?.key).toBe("trinket_picture");

    for (const [rank, targetRank] of V17_MERGES) {
      const icon = byRank.get(rank);
      const target = byRank.get(targetRank);
      expect(icon, `rank ${rank}`).toBeDefined();
      expect(target, `rank ${targetRank}`).toBeDefined();
      if (!icon || !target) continue;
      expect(icon.status).toBe(target.status);
      expect(icon.status).toBe("confirmed");
      expect(icon.meaning_en).toBe(target.meaning_en);
      expect(icon.meaning_zh).toBe(target.meaning_zh);
      expect(icon.kind).toBe(target.kind);
      expect(icon.key).toBe(target.key);
      expect(icon.value).toBe(target.value);
      expect(icon.value_in_glyph).toBe(target.value_in_glyph);
      expect(icon.rulebook_refs).toEqual(target.rulebook_refs);
      expect(icon.group.startsWith("g_")).toBe(true);
      expect(icon.group).not.toBe(target.group);
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.notes).toContain(`merged_into=${target.iconId}`);
      expect(icon.notes).toContain("batch-07");
      expect(icon.previous_status).toBeNull();
      expect(icon.previous_meaning_en).toBeNull();
      expect(icon.proposal).toBeNull();
    }

    const life = byRank.get(907);
    const lifeTarget = byRank.get(21);
    expect(life?.key).toBe("life");
    expect(life?.value).toBeNull();
    expect(life?.value).toBe(lifeTarget?.value);
    expect(life?.value_in_glyph).toBe(false);
    expect(life?.evidence).toContain("26");

    for (const rank of V17_KEEPS) {
      const kept = byRank.get(rank);
      expect(kept?.status).toBe("needs_review");
      expect(kept?.key).toBe(`pending_${kept?.iconId}`);
      expect(kept?.kind).toBe("");
      expect(kept?.proposal).toBeNull();
      expect(kept?.value).toBeNull();
      expect(kept?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(kept?.previous_status).toBeNull();
      expect(kept?.meaning_en).toBe(V17_KEEP_MEANING[rank]);
      expect(kept?.meaning_zh.startsWith("待确认图形：")).toBe(true);
      expect(kept?.meaning_en.toLowerCase()).not.toContain("dodge");
      expect(kept?.meaning_en.toLowerCase()).not.toContain("gambler");
      expect(kept?.meaning_zh).not.toContain("闪避");
    }

    for (const rank of V17_CATEGORIZE) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("confirmed");
      expect(icon?.key).toBe("trinket_picture");
      expect(icon?.kind).toBe("other");
      expect(icon?.meaning_en).toBe(picture?.meaning_en);
      expect(icon?.meaning_zh).toBe(picture?.meaning_zh);
      expect(icon?.value).toBeNull();
      expect(icon?.value_in_glyph).toBe(false);
      expect(icon?.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon?.group.startsWith("g_")).toBe(true);
      expect(icon?.group).not.toBe(picture?.group);
      expect(icon?.notes).toContain("2026-10-08");
      expect(icon?.notes).not.toContain("merged_into");
      expect(icon?.notes).toContain("not merge_into");
    }
  });

  it("v1.8 batch-08：79 条归入 skill_art，通用含义，不是 merge；r195、r544、r569 留下", () => {
    const byRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));
    expect(new Set(V18_CATEGORIZE).size).toBe(79);
    expect(dictionary.meta.resolved_in_v1_8.length).toBeGreaterThan(0);
    expect(dictionary.meta.stats.status_all976).toEqual({
      confirmed: 657,
      confirmed_rulebook: 44,
      needs_review: 31,
      decor: 110,
      unsure: 0,
      unreviewed: 141,
    });
    expect(dictionary.meta.stats.status_top525).toEqual({
      confirmed: 420,
      confirmed_rulebook: 44,
      needs_review: 9,
      decor: 52,
      unsure: 0,
      unreviewed: 0,
    });

    const back = byRank.get(274);
    const front = byRank.get(431);
    const jesterBack = byRank.get(490);
    expect(back?.meaning_en).not.toBe("Skill picture");
    expect(front?.meaning_en).not.toBe("Skill picture");
    expect(jesterBack?.meaning_en).not.toBe("Skill picture");

    let fromNeeds = 0;
    let fromUnreviewed = 0;
    for (const rank of V18_CATEGORIZE) {
      const icon = byRank.get(rank);
      expect(icon, `rank ${rank}`).toBeDefined();
      if (!icon) continue;
      expect(icon.status).toBe("confirmed");
      expect(icon.key).toBe("skill_art");
      expect(icon.kind).toBe("other");
      expect(icon.meaning_en).toBe("Skill picture");
      expect(icon.meaning_zh).toBe("技能插画");
      expect(icon.meaning_en).not.toBe(back?.meaning_en);
      expect(icon.meaning_en).not.toBe(front?.meaning_en);
      expect(icon.meaning_zh).not.toBe(back?.meaning_zh);
      expect(icon.meaning_zh).not.toBe(front?.meaning_zh);
      expect(icon.value).toBeNull();
      expect(icon.value_in_glyph).toBe(false);
      expect(icon.group).toBe("skill_art");
      expect(icon.source).toBe("kyries_approved_proposal_2026-10-07");
      expect(icon.proposal).toBeNull();
      expect(icon.confidence).toBe("high");
      expect(icon.notes).toContain("batch-08");
      expect(icon.notes).toContain("not merge_into");
      expect(icon.notes).not.toContain("merged_into");
      if (icon.previous_status === "needs_review") {
        fromNeeds += 1;
        expect(icon.previous_meaning_en?.startsWith("Unconfirmed glyph:")).toBe(true);
      } else {
        fromUnreviewed += 1;
        expect(icon.previous_status).toBe("unreviewed");
        expect(icon.previous_meaning_en).toBeNull();
      }
    }
    expect(fromNeeds).toBe(31);
    expect(fromUnreviewed).toBe(48);

    const highwayman = byRank.get(539);
    expect(highwayman?.iconId).toBe("7e323fd8ca");
    expect(highwayman?.iconId).not.toBe(jesterBack?.iconId);
    expect(highwayman?.meaning_en).not.toBe(jesterBack?.meaning_en);
    expect(highwayman?.notes).toContain("Not merge_into r490");

    for (const rank of V18_KEEPS.filter((rank) => rank !== 544)) {
      const icon = byRank.get(rank);
      expect(icon?.status).toBe("needs_review");
      expect(icon?.key).toBe(`pending_${icon?.iconId}`);
      expect(icon?.kind).toBe("");
      expect(icon?.key).not.toBe("skill_art");
    }
  });
});

describe("词典与 raw 提取结果", () => {
  const summary = parseSchema(
    extractSummarySchema,
    JSON.parse(readFileSync(path.join(DATA_ROOT, "extract/corebox/reports/summary.json"), "utf8")),
    "summary",
  );
  const rawIds = rawIconIds();

  it("词典里的每个 iconId 都在 raw 里出现过", () => {
    expect(rawIds.size).toBe(summary.icons.total_clusters);
    expect(summary.icons.to_annotate).toBe(906);
    // v1.7 把 70 个误放进装饰切图、不在 to_annotate 里的 iconId 收进词典。
    expect(dictionary.icons).toHaveLength(summary.icons.to_annotate + 70 + 7);
    const missing = dictionary.icons
      .filter((icon) => !rawIds.has(icon.iconId))
      .map((icon) => icon.iconId);
    expect(missing).toEqual([]);
  });

  it("raw 里有、词典未收的 id 数量为 807", () => {
    let rawOnly = 0;
    const dictionaryIds = new Set(dictionary.icons.map((icon) => icon.iconId));
    for (const iconId of rawIds) {
      if (!dictionaryIds.has(iconId)) rawOnly += 1;
    }
    expect(rawOnly).toBe(RAW_ICON_IDS_NOT_IN_DICTIONARY);
    expect(rawOnly).toBe(rawIds.size - dictionary.icons.length);
  });
});

describe("起始位置逐处归类", () => {
  it("CSV 的 rank 对上词典里的 start_* 图标", () => {
    const rows = parseCsv(
      readFileSync(path.join(DICT_ROOT, "start_locations_by_placement.csv"), "utf8"),
    );
    const header = rows[0];
    expect(header).toBeDefined();
    if (!header) return;
    const rankCol = column(header, "rank");
    const categoryCol = column(header, "category");
    const pageCol = column(header, "page");
    const faceCol = column(header, "face");
    const bboxCol = column(header, "bbox_mm");
    const classCol = column(header, "class");
    const categories = new Set<string>([...RAW_CARD_CATEGORIES, ...RAW_SHEET_CATEGORIES]);
    const byRank = new Map<number, Set<string>>();
    const iconsByRank = new Map(dictionary.icons.map((icon) => [icon.rank, icon]));

    for (const row of rows.slice(1)) {
      const rank = Number(row[rankCol]);
      const category = row[categoryCol] ?? "";
      const page = Number(row[pageCol]);
      const face = row[faceCol] ?? "";
      const bbox = row[bboxCol] ?? "";
      const placement = row[classCol] ?? "";
      expect(Number.isInteger(rank)).toBe(true);
      expect(categories.has(category)).toBe(true);
      expect(Number.isInteger(page) && page > 0).toBe(true);
      expect(["front", "back"]).toContain(face);
      expect(bbox).toMatch(/^\[[\d.]+, [\d.]+, [\d.]+, [\d.]+\]$/);
      expect(placement === "other" || PLACEMENT_CLASS.test(placement)).toBe(true);
      const classes = byRank.get(rank) ?? new Set<string>();
      classes.add(placement);
      byRank.set(rank, classes);
    }

    const startRanks = dictionary.icons
      .filter((icon) => icon.key.startsWith("start_"))
      .map((icon) => icon.rank);
    for (const rank of startRanks) {
      expect(byRank.has(rank), `词典 start_* rank ${rank} 不在 CSV 中`).toBe(true);
    }

    const notStart = [...byRank.keys()]
      .filter((rank) => {
        const icon = iconsByRank.get(rank);
        return icon?.key.startsWith("start_") !== true;
      })
      .sort((a, b) => a - b);
    // rank 216、379 在逐处表里。v1.2 把它们留成 pending_，不是 start_*。
    expect(notStart).toEqual([216, 379]);
    const stanceSupport = iconsByRank.get(216);
    expect(stanceSupport?.key).toBe("pending_293f170eab");
    expect(stanceSupport?.status).toBe("needs_review");
    expect([...(byRank.get(216) ?? [])]).toEqual(["monster_support"]);
    const mixedKept = iconsByRank.get(379);
    expect(mixedKept?.key).toBe("pending_73a29c830c");
    expect(mixedKept?.status).toBe("needs_review");
    const mixedPlacements = [...(byRank.get(379) ?? [])].filter(
      (placement) => placement !== "other",
    );
    expect(new Set(mixedPlacements).size).toBeGreaterThan(1);

    for (const [rank, classes] of byRank) {
      if (rank === 216 || rank === 379) continue;
      const icon = iconsByRank.get(rank);
      expect(icon, `rank ${rank}`).toBeDefined();
      if (!icon) continue;
      const match = START_KEY.exec(icon.key);
      expect(match, icon.key).not.toBeNull();
      const side = match?.[1];
      const stanceName = match?.[2];
      for (const placement of classes) {
        if (placement === "other") continue;
        const parsed = PLACEMENT_CLASS.exec(placement);
        expect(parsed, `${rank} ${placement}`).not.toBeNull();
        if (side !== "any") expect(parsed?.[1]).toBe(side);
        if (stanceName !== "any") expect(parsed?.[2]).toBe(stanceName);
      }
    }

    for (const rank of MIXED_START_RANKS) {
      const icon = iconsByRank.get(rank);
      expect(icon?.key.includes("any")).toBe(true);
      const concrete = [...(byRank.get(rank) ?? [])].filter((placement) => placement !== "other");
      expect(new Set(concrete).size).toBeGreaterThan(1);
    }
  });
});
