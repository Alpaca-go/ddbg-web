import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { iconDictionarySchema } from "../../../src/shared/dictionary/schema";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import {
  COVE_HIGHER_MONSTER_IDENTITIES,
  COVE_LEVEL_ONE_MONSTER_IDENTITIES,
  buildCoveHigherMonsters,
  buildCoveLevelOneMonsters,
} from "../../../src/cove/monsters/monsters.build";
import { COVE_MONSTER_CATALOG_EXCLUSIONS } from "../../../src/cove/monsters/excluded-monsters";
import {
  loadNormalizedCoveHigherMonsters,
  loadNormalizedCoveLevelOneMonsters,
  writeNormalizedCoveHigherMonsters,
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

if (process.env.WRITE_NORMALIZED === "1") {
  writeNormalizedCoveLevelOneMonsters();
  writeNormalizedCoveHigherMonsters();
}
const built = loadNormalizedCoveLevelOneMonsters();
const higherBuilt = loadNormalizedCoveHigherMonsters();

const catalogedIds = () =>
  new Set<string>([
    ...COVE_LEVEL_ONE_MONSTER_IDENTITIES.map((entry) => entry.id),
    ...COVE_HIGHER_MONSTER_IDENTITIES.map((entry) => entry.id),
  ]);

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

  it("raw 其余卡面均在排除登记或可审目录中可追溯", () => {
    const mediumRaw = rawFileSchema.parse(read("extract/extension/cove/raw/monster_medium.json"));
    const largeRaw = rawFileSchema.parse(read("extract/extension/cove/raw/monster_large.json"));
    const included = catalogedIds();
    const excluded = new Set<string>(COVE_MONSTER_CATALOG_EXCLUSIONS.map((entry) => entry.id));
    for (const card of [...mediumRaw.cards, ...largeRaw.cards]) {
      expect(included.has(card.id) || excluded.has(card.id), card.id).toBe(true);
    }
    expect(excluded.size).toBe(15);
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

describe("Cove II／III 普通怪物资料目录（与 I 级分文件）", () => {
  it("重建结果与提交文件一致", () => {
    for (const [name, file] of Object.entries(higherBuilt)) {
      const fileName =
        name === "monster_medium" ? "monster_medium_higher.json" : "monster_large_higher.json";
      expect(file).toEqual(read(`normalized/extension/cove/${fileName}`));
      expect(file.sources.raw).toBe(`extract/extension/cove/raw/${name}.json`);
      expect(file.sources.parsed).toBe(`extract/extension/cove/parsed/${name}.json`);
    }
  });

  it("纳入 Uca Major II 与 Squiffy Ghast III，印张份数与印刷一致", () => {
    expect(higherBuilt.monster_medium.cards).toHaveLength(2);
    expect(higherBuilt.monster_large.cards).toHaveLength(2);
    const ucaRef = higherBuilt.monster_medium.cards.find(
      (c) => c.id === "monster_medium:cove:p018",
    )!;
    expect(ucaRef.level).toBe(2);
    expect(ucaRef.copies).toBe(2);
    expect(ucaRef.pages).toEqual([18, 19]);
    expect("card_kind" in ucaRef && ucaRef.card_kind).toBe("large_monster_reference");
    const squiffy = higherBuilt.monster_medium.cards.find(
      (c) => c.id === "monster_medium:cove:p020",
    )!;
    expect(squiffy.level).toBe(3);
    expect(squiffy.copies).toBe(3);
    expect(squiffy.pages).toEqual([20, 21, 22]);
    const ucaLarge = higherBuilt.monster_large.cards;
    expect(ucaLarge.map((c) => c.id).sort()).toEqual([
      "monster_large:cove:p001",
      "monster_large:cove:p002",
    ]);
    expect(ucaLarge.every((c) => c.level === 2 && c.name === "Uca Major")).toBe(true);
    expect(ucaLarge.reduce((sum, c) => sum + c.copies, 0)).toBe(2);
    expect(new Set(higherBuilt.monster_medium.cards.map((c) => c.id))).toEqual(
      new Set(
        COVE_HIGHER_MONSTER_IDENTITIES.filter((e) => e.id.startsWith("monster_medium:")).map(
          (e) => e.id,
        ),
      ),
    );
  });

  it("未核准，不接 I 级目录", () => {
    for (const card of [...higherBuilt.monster_medium.cards, ...higherBuilt.monster_large.cards]) {
      expect(card.level).toBeGreaterThan(1);
      expect(card.verification.unverified).toBe(true);
      expect(card.verification.reasons.length).toBeGreaterThan(0);
    }
    const levelOneIds = new Set(built.monster_medium.cards.map((c) => c.id));
    for (const card of higherBuilt.monster_medium.cards) {
      expect(levelOneIds.has(card.id)).toBe(false);
    }
  });

  it.each(["missing", "level"])("拒绝损坏的 II/III 选中集：%s", (mutation) => {
    const source = input();
    const cards = (source.mediumParsed as { cards: Record<string, unknown>[] }).cards;
    const target = cards.find((c) => c.id === "monster_medium:cove:p018")!;
    if (mutation === "missing") {
      const index = cards.indexOf(target);
      cards.splice(index, 1);
    }
    if (mutation === "level") target.level = 1;
    expect(() => buildCoveHigherMonsters(source)).toThrow();
  });
});
