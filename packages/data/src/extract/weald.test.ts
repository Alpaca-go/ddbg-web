import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../content-packs";
import { monsterLargeFileSchema, monsterMediumFileSchema } from "./parsed";
import { rawFileSchema } from "./raw";

const root = new URL("../../extract/extension/weald/", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

// Weald R1 部件表；61 张 Monster & Boss = 25 medium + 15 large + 21 ability。
const components = {
  monster_medium: 25,
  monster_large: 15,
  boss_ability: 21,
  curio: 16,
  room: 12,
  stygian_room: 9,
  quest: 15,
  dungeon_tile: 6,
  punchboard: 1,
};

describe("Weald 地点印刷导入（R-001、R-048；Weald R1–4）", () => {
  it.each(Object.entries(components))("%s 的副本、正反面和命名空间完整", (category, count) => {
    const file = rawFileSchema.parse(read(`raw/${category}.json`));
    expect(file.category).toBe(category);
    expect(file.n_pages).toBe(count);
    expect(file.n_copies_total).toBe(count);
    expect(file.cards.flatMap((card) => card.pages).sort((a, b) => a - b)).toEqual(
      Array.from({ length: count }, (_, i) => i + 1),
    );
    expect(new Set(file.cards.map((card) => card.id)).size).toBe(file.n_unique);
    for (const card of file.cards) {
      expect(cardContentPack(card)).toBe("weald");
      expect(card.faces.front.page).toBe(card.pages[0]);
      expect(card.faces.back?.page).toBe(card.pages[0]);
      for (const face of Object.values(card.faces)) {
        if (!face) continue;
        expect(face.file).toContain("MG_DD_06_EN_WEALD/");
        expect(face.file).not.toMatch(/Old.Version/i);
      }
    }
  });

  it("成功解析的怪物符合核心 schema，失败卡保留原始数据和停点", () => {
    for (const [category, schema] of [
      ["monster_medium", monsterMediumFileSchema],
      ["monster_large", monsterLargeFileSchema],
    ] as const) {
      const parsed = read(`parsed/${category}.json`) as {
        cards: { id: string; issues: string[] }[];
        stats: { cards: number; failed: number; ok: number };
        failures: { id: string; issues: string[] }[];
      };
      const raw = rawFileSchema.parse(read(`raw/${category}.json`));
      expect(parsed.cards.map((card) => card.id)).toEqual(raw.cards.map((card) => card.id));
      expect(parsed.stats.cards).toBe(raw.n_unique);
      expect(parsed.stats.failed).toBe(parsed.failures.length);
      expect(parsed.stats.ok + parsed.stats.failed).toBe(raw.n_unique);
      expect(parsed.failures.map((card) => card.id)).toEqual(
        parsed.cards.filter((card) => card.issues.length > 0).map((card) => card.id),
      );
      // 完整文件 schema 不接受缺字段；仅成功卡可交给后续规范化。
      schema.parse({
        ...(read(`parsed/${category}.json`) as object),
        cards: parsed.cards.filter((card) => card.issues.length === 0),
      });
    }
  });

  it("Ectoplasm 召唤数量不算作额外技能，保留三个印刷技能", () => {
    const parsed = read("parsed/monster_medium.json") as {
      cards: { id: string; skills: { slot: number; name: string }[]; issues: string[] }[];
    };
    const card = parsed.cards.find((card) => card.id === "monster_medium:weald:p001")!;
    expect(card.issues).toEqual([]);
    expect(card.skills.map((skill) => [skill.slot, skill.name])).toEqual([
      [1, "Slime"],
      [2, "Cytokinesis"],
      [3, "Ectoplasmic Profusion"],
    ]);
  });
});
