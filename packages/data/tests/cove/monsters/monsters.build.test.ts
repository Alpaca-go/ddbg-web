import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { iconDictionarySchema } from "../../../src/shared/dictionary/schema";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import {
  COVE_LEVEL_ONE_MONSTER_IDENTITIES,
  buildCoveLevelOneMonsters,
} from "../../../src/cove/monsters/monsters.build";
import { COVE_MONSTER_CATALOG_EXCLUSIONS } from "../../../src/cove/monsters/excluded-monsters";
import {
  loadNormalizedCoveLevelOneMonsters,
  writeNormalizedCoveLevelOneMonsters,
} from "../../../src/cove/write";

const root = new URL("../../../", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

function input() {
  return {
    mediumRaw: rawFileSchema.parse(read("extract/extension/cove/raw/monster_medium.json")),
    largeRaw: rawFileSchema.parse(read("extract/extension/cove/raw/monster_large.json")),
    mediumParsed: read("extract/extension/cove/parsed/monster_medium.json"),
    largeParsed: read("extract/extension/cove/parsed/monster_large.json"),
    dictionary: iconDictionarySchema.parse(read("dictionary/icon-dictionary-v1.8.json")),
  };
}

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveLevelOneMonsters();
const built = loadNormalizedCoveLevelOneMonsters();

describe("Cove I 级普通怪物规范化（Q-186 / 内容包隔离）", () => {
  it("重建结果与提交文件一致，来源仍指向 Cove", () => {
    for (const [name, file] of Object.entries(built)) {
      expect(file).toEqual(read(`normalized/extension/cove/${name}.json`));
      expect(file.sources.raw).toBe(`extract/extension/cove/raw/${name}.json`);
      expect(file.sources.parsed).toBe(`extract/extension/cove/parsed/${name}.json`);
    }
  });

  it("纳入六张 I 级中型战斗卡，不含召唤物、Boss 或 II/III 级", () => {
    expect(built.monster_medium.cards).toHaveLength(COVE_LEVEL_ONE_MONSTER_IDENTITIES.length);
    expect(built.monster_medium.cards.flatMap((card) => card.pages)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(built.monster_medium.cards.reduce((sum, card) => sum + card.copies, 0)).toBe(17);
    expect(built.monster_large.cards).toHaveLength(0);
    expect(new Set(built.monster_medium.cards.map((card) => card.id))).toEqual(
      new Set(COVE_LEVEL_ONE_MONSTER_IDENTITIES.map((entry) => entry.id)),
    );
  });

  it("Q-186 停点：保留 life 与技能行，全部未核准，不写默认战斗值扩展", () => {
    for (const card of built.monster_medium.cards) {
      expect(card.level).toBe(1);
      expect(card.verification.unverified).toBe(true);
      expect(card.verification.reasons.length).toBeGreaterThan(0);
      expect("life" in card).toBe(true);
      if (!("skills" in card)) continue;
      for (const skill of card.skills) {
        expect(skill).not.toHaveProperty("annotation_damage");
        expect(skill.rules?.wealdAttack).toBeUndefined();
      }
    }
  });

  it("raw 其余卡面均在排除登记中可追溯", () => {
    const mediumRaw = rawFileSchema.parse(read("extract/extension/cove/raw/monster_medium.json"));
    const largeRaw = rawFileSchema.parse(read("extract/extension/cove/raw/monster_large.json"));
    const included = new Set<string>(COVE_LEVEL_ONE_MONSTER_IDENTITIES.map((entry) => entry.id));
    const excluded = new Set<string>(COVE_MONSTER_CATALOG_EXCLUSIONS.map((entry) => entry.id));
    for (const card of [...mediumRaw.cards, ...largeRaw.cards]) {
      expect(included.has(card.id) || excluded.has(card.id), card.id).toBe(true);
    }
    expect(excluded.size).toBe(19);
  });

  it.each(["missing", "duplicate", "level", "name", "pages"])(
    "拒绝 %s 的已选中卡解析数据，不静默缩池",
    (mutation) => {
      const source = input();
      const cards = (source.mediumParsed as { cards: Record<string, unknown>[] }).cards;
      if (mutation === "missing") cards.shift();
      if (mutation === "duplicate") cards.push(structuredClone(cards[0]!));
      if (mutation === "level") cards[0]!.level = 2;
      if (mutation === "name") cards[0]!.name = "Ectoplasm";
      if (mutation === "pages") cards[0]!.pages = [1];
      expect(() => buildCoveLevelOneMonsters(source)).toThrow();
    },
  );
});
