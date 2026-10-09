import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { RawFile } from "./raw";
import { RAW_CARD_CATEGORIES, RAW_SHEET_CATEGORIES, rawFileSchema } from "./raw";
import { extractSummarySchema, reconciliationReportSchema } from "./reports";
import type { ReconciliationReport } from "./reports";

const COREBOX_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../extract/corebox",
);

/** 说明书 §1.2，核心盒部件清单（R4–R5）。顺序与 reconciliation.json 一致。 */
const RULEBOOK_ROWS = [
  ["Hero Skill Cards", 231, "hero_skill"],
  ["Hero Cards", 23, "hero_stat"],
  ["Hero PvP Cards", 22, "hero_pvp (base)"],
  ["Monster & Boss Cards", 168, "monster_medium (base) + monster_large + boss_ability"],
  ["Trinkets", 38, "trinket"],
  ["Curio Cards", 24, "curio"],
  ["Hamlet Events", 16, "hamlet_event"],
  ["Quest Cards", 19, "quest"],
  ["Diseases", 11, "disease"],
  ["Stygian Room Cards", 17, "stygian_room"],
  ["Positive + Negative Quirks", 35, "quirk"],
  ["Virtues + Afflictions", 10, "virtue_affliction"],
  ["Room Cards + Boss Room Cards", 25, "room"],
  ["Player Aid Cards", 8, "player_aid"],
  ["Initiative Cards", 8, "initiative (text-free, manual entry)"],
] as const;

const DIRECT_CATEGORIES = [
  "hero_skill",
  "hero_stat",
  "trinket",
  "curio",
  "hamlet_event",
  "quest",
  "disease",
  "stygian_room",
  "quirk",
  "virtue_affliction",
  "room",
  "player_aid",
] as const;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(COREBOX_ROOT, relativePath), "utf8")) as unknown;
}

function sha1(relativePath: string): string {
  return createHash("sha1")
    .update(readFileSync(path.join(COREBOX_ROOT, relativePath)))
    .digest("hex");
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

function readRaw(category: string): RawFile {
  return parseSchema(rawFileSchema, readJson(`raw/${category}.json`), category);
}

function baseFrontPages(file: RawFile): number {
  return file.sources
    .filter((source) => source.source_set === "base")
    .reduce((sum, source) => sum + source.front_pages, 0);
}

function baseUnique(file: RawFile): number {
  return file.cards.filter((card) => card.source_set === "base").length;
}

function outputFixturePath(outputKey: string): string {
  const match = /^(raw|parsed)\/corebox\/([^/]+\.json)$/.exec(outputKey);
  if (!match?.[1] || !match[2]) {
    throw new Error(`无法对应 summary 输出路径 ${outputKey}`);
  }
  return path.posix.join(match[1], match[2]);
}

describe("核心盒提取 fixture", () => {
  const summary = parseSchema(extractSummarySchema, readJson("reports/summary.json"), "summary");

  it("summary 里每个输出都在库里，且 sha1 与字节数一致", () => {
    const seen = new Set<string>();
    for (const [outputKey, meta] of Object.entries(summary.outputs)) {
      const relativePath = outputFixturePath(outputKey);
      seen.add(relativePath);
      expect(sha1(relativePath)).toBe(meta.sha1);
      const bytes = readFileSync(path.join(COREBOX_ROOT, relativePath)).byteLength;
      expect(bytes).toBe(meta.bytes);
    }
    const onDisk = [
      ...readdirSync(path.join(COREBOX_ROOT, "raw")).map((name) => `raw/${name}`),
      ...readdirSync(path.join(COREBOX_ROOT, "parsed")).map((name) => `parsed/${name}`),
    ];
    expect(onDisk.sort()).toEqual([...seen].sort());
  });

  it("summary 的类别计数与 raw 文件一致", () => {
    expect(Object.keys(summary.categories).sort()).toEqual(
      [...RAW_CARD_CATEGORIES, ...RAW_SHEET_CATEGORIES].sort(),
    );
    for (const category of Object.keys(summary.categories)) {
      const raw = readRaw(category);
      expect(summary.categories[category]).toEqual({
        pages: raw.n_pages,
        unique: raw.n_unique,
        copies: raw.n_copies_total,
      });
    }
  });

  it("全部 raw JSON 通过 ddbg-raw-v1", () => {
    for (const category of [...RAW_CARD_CATEGORIES, ...RAW_SHEET_CATEGORIES]) {
      const raw = readRaw(category);
      expect(raw.category).toBe(category);
    }
  });

  it("hero_skill 第 44 页保留印刷 Acc 1O", () => {
    const raw = readRaw("hero_skill");
    const face = raw.cards.find((card) => card.id === "hero_skill:p044")?.faces.front;
    expect(face?.spans.some((span) => span.t === "Acc 1O")).toBe(true);
  });

  it("入库 JSON 不含 Musketeer", () => {
    for (const folder of ["raw", "parsed", "reports"] as const) {
      for (const name of readdirSync(path.join(COREBOX_ROOT, folder))) {
        const text = readFileSync(path.join(COREBOX_ROOT, folder, name), "utf8");
        expect(text.toLowerCase()).not.toContain("musketeer");
      }
    }
  });
});

describe("部件对账", () => {
  const report = parseSchema(
    reconciliationReportSchema,
    readJson("reports/reconciliation.json"),
    "reconciliation",
  );

  it("15 项与规则书数量一致，并且 match 全为 true", () => {
    expect(report).toHaveLength(15);
    expect(
      report.map((row) => [row.rulebook_item, row.rulebook_count, row.extracted_from]),
    ).toEqual(RULEBOOK_ROWS.map((row) => [row[0], row[1], row[2]]));
    expect(report.every((row) => row.match && row.pages === row.rulebook_count)).toBe(true);
  });

  it("直接对应的类别，页数、不重复数、副本数与 raw 一致", () => {
    for (const category of DIRECT_CATEGORIES) {
      const row = rowBySource(report, category);
      const raw = readRaw(category);
      expect(row.pages).toBe(baseFrontPages(raw));
      expect(row.unique).toBe(baseUnique(raw));
      expect(row.copies_total).toBe(baseFrontPages(raw));
    }
  });

  it("PvP 与怪物的规则书数量只计基础文件，不计 ADD_014", () => {
    const pvp = readRaw("hero_pvp");
    const pvpRow = rowBySource(report, "hero_pvp (base)");
    expect(baseFrontPages(pvp)).toBe(pvpRow.pages);
    expect(baseUnique(pvp)).toBe(pvpRow.unique);
    expect(pvp.cards.filter((card) => card.source_set === "ADD_014")).toHaveLength(2);
    expect(pvp.n_pages).toBe(24);

    const medium = readRaw("monster_medium");
    const large = readRaw("monster_large");
    const boss = readRaw("boss_ability");
    const monsterRow = rowBySource(report, "monster_medium (base) + monster_large + boss_ability");
    expect(baseFrontPages(medium) + baseFrontPages(large) + baseFrontPages(boss)).toBe(
      monsterRow.pages,
    );
    expect(baseUnique(medium) + baseUnique(large) + baseUnique(boss)).toBe(monsterRow.unique);
    expect(monsterRow.copies_total).toBe(monsterRow.pages);
    const addendum = medium.cards.filter((card) => card.source_set === "ADD_014");
    expect(addendum).toHaveLength(2);
    expect(addendum.reduce((sum, card) => sum + card.copies, 0)).toBe(4);
  });

  it("房间卡印有 BOSS 的是 8 张，其余 17 张", () => {
    const room = readRaw("room");
    const boss = room.cards.filter((card) =>
      card.faces.front.spans.some((span) => span.t === "BOSS"),
    );
    expect(boss).toHaveLength(8);
    expect(room.cards).toHaveLength(25);
  });

  it("先攻卡没有文本，对账只核对页数", () => {
    const row = rowBySource(report, "initiative (text-free, manual entry)");
    expect(row.unique).toBeNull();
    expect(row.pages).toBe(8);
    expect(row.copies_total).toBe(8);
    const summary = parseSchema(extractSummarySchema, readJson("reports/summary.json"), "summary");
    const fronts = summary.text_free.filter(
      (entry) => entry.label === "initiative" && entry.file.includes("FRONT"),
    );
    expect(fronts.map((entry) => entry.pages)).toEqual([8]);
  });
});

function rowBySource(report: ReconciliationReport, extractedFrom: string) {
  const row = report.find((entry) => entry.extracted_from === extractedFrom);
  if (!row) throw new Error(`对账表缺少 ${extractedFrom}`);
  return row;
}
