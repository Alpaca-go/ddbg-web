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

/** `summary.json` 的 total_clusters（1713）减去词典 906 条。 */
const RAW_ICON_IDS_NOT_IN_DICTIONARY = 807;

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
] as const;

/** 同一 iconId 里站位或阵营不一致，词典 key 用 any。 */
const MIXED_START_RANKS = [127, 132, 258, 259, 379] as const;

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
  readJson("icon-dictionary-v1.1.json"),
  "icon-dictionary-v1.1",
);

describe("图标词典 v1.1", () => {
  it("通过 schema，共 906 条", () => {
    expect(dictionary.meta.version).toBe("1.1");
    expect(dictionary.icons).toHaveLength(906);
    expect(dictionary.inconsistencies.map((item) => item.id)).toEqual([...INCONSISTENCY_IDS]);
    const ranks = new Set(dictionary.icons.map((icon) => icon.rank));
    for (const item of dictionary.inconsistencies) {
      expect(item.ranks.every((rank) => ranks.has(rank))).toBe(true);
    }
  });

  it("status 计数与文件内 stats 一致", () => {
    const stats = dictionary.meta.stats;
    expect(statusCounts(dictionary.icons)).toEqual(stats.status_all906);
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
    ).toBe(stats.coverage_all906_confirmed_rulebook_decor.card_occurrences);
    expect(
      sum(
        dictionary.icons.filter((icon) => settled.has(icon.status)),
        (icon) => icon.occurrences,
      ),
    ).toBe(stats.coverage_all906_confirmed_rulebook_decor.occurrences);
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
    const rows = parseCsv(readFileSync(path.join(DICT_ROOT, "icon-dictionary-v1.1.csv"), "utf8"));
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
    expect(dictionary.icons).toHaveLength(summary.icons.to_annotate);
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

    const notStart = [...byRank.keys()].filter((rank) => {
      const icon = iconsByRank.get(rank);
      return icon?.key.startsWith("start_") !== true;
    });
    // rank 216 在逐处表里，词典 key 是 stance_support（needs_review），不是 start_*。
    expect(notStart).toEqual([216]);
    const stanceSupport = iconsByRank.get(216);
    expect(stanceSupport?.key).toBe("stance_support");
    expect(stanceSupport?.status).toBe("needs_review");
    expect([...(byRank.get(216) ?? [])]).toEqual(["monster_support"]);

    for (const [rank, classes] of byRank) {
      if (rank === 216) continue;
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
