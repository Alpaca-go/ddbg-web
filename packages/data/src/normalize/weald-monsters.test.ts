import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { iconDictionarySchema } from "../dictionary/schema";
import { rawFileSchema } from "../extract/raw";
import { buildWealdLevelOneMonsters } from "./weald-monsters";
import {
  loadNormalizedWealdLevelOneMonsters,
  writeNormalizedWealdLevelOneMonsters,
} from "./write-weald";

const root = new URL("../../", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;
function input() {
  return {
    mediumRaw: rawFileSchema.parse(read("extract/extension/weald/raw/monster_medium.json")),
    largeRaw: rawFileSchema.parse(read("extract/extension/weald/raw/monster_large.json")),
    mediumParsed: read("extract/extension/weald/parsed/monster_medium.json") as {
      cards: Record<string, unknown>[];
    },
    largeParsed: read("extract/extension/weald/parsed/monster_large.json"),
    dictionary: iconDictionarySchema.parse(read("dictionary/icon-dictionary-v1.8.json")),
  };
}

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWealdLevelOneMonsters();
const built = loadNormalizedWealdLevelOneMonsters();

describe("Weald I 级普通怪物规范化（W3 / 核心 R24 / Q-186）", () => {
  it("重建结果与提交文件一致，来源仍指向 Weald", () => {
    for (const [name, file] of Object.entries(built)) {
      expect(file).toEqual(read(`normalized/extension/weald/${name}.json`));
      expect(file.sources.raw).toBe(`extract/extension/weald/raw/${name}.json`);
      expect(file.sources.parsed).toBe(`extract/extension/weald/parsed/${name}.json`);
    }
  });

  it("保留 14 张牌堆卡与两张大型战斗卡，不把 Boss、召唤专属或高等级卡混入", () => {
    expect(built.monster_medium.cards.flatMap((card) => card.pages)).toEqual(
      Array.from({ length: 14 }, (_, i) => i + 1),
    );
    expect(built.monster_medium.cards.reduce((sum, card) => sum + card.copies, 0)).toBe(14);
    expect(built.monster_large.cards).toHaveLength(1);
    expect(built.monster_large.cards[0]?.pages).toEqual([1, 2]);
    expect(new Set(built.monster_medium.cards.map((card) => card.name))).toEqual(
      new Set([
        "Ectoplasm",
        "Large Ectoplasm",
        "Rabid Gnasher",
        "Fungal Scratcher",
        "Fungal Artillery",
      ]),
    );
    const references = built.monster_medium.cards.filter((card) => "card_kind" in card);
    expect(references.map((card) => card.pages)).toEqual([[4], [5]]);
    for (const reference of references) expect("life" in reference).toBe(false);
  });

  it("只转录 R24 明确标注的 Life，其他待核实字段不填默认值", () => {
    const cards = [...built.monster_medium.cards, ...built.monster_large.cards];
    expect(cards.filter((card) => "life" in card).map((card) => [card.name, card.life])).toEqual([
      ["Ectoplasm", 6],
      ["Rabid Gnasher", 7],
      ["Fungal Scratcher", 14],
      ["Fungal Artillery", 9],
      ["Large Ectoplasm", 22],
    ]);
    for (const card of cards) {
      expect(card.level).toBe(1);
      expect(card.verification.unverified).toBe(true);
      expect(card.verification.reasons.length).toBeGreaterThan(0);
      expect(card).not.toHaveProperty("speed");
      expect(card).not.toHaveProperty("stanceGroups");
      if (!("skills" in card)) continue;
      for (const skill of card.skills) {
        expect(skill).not.toHaveProperty("verified_damage");
        expect(skill).not.toHaveProperty("verified_range");
        expect(skill).not.toHaveProperty("verified_monster_effects");
      }
    }
  });

  it.each(["missing", "duplicate", "level", "name", "pages", "life"])(
    "拒绝 %s 的已选卡解析数据，不静默缩池",
    (mutation) => {
      const source = input();
      const cards = source.mediumParsed.cards;
      if (mutation === "missing") cards.shift();
      if (mutation === "duplicate") cards.push(structuredClone(cards[0]!));
      if (mutation === "level") cards[0]!.level = 2;
      if (mutation === "name") cards[0]!.name = "Brigand Matchman";
      if (mutation === "pages") cards[0]!.pages = [1];
      if (mutation === "life") delete cards[0]!.hp;
      expect(() => buildWealdLevelOneMonsters(source)).toThrow();
    },
  );

  it("拒绝把核心卡来源套到 Weald，以及不同页码的背面", () => {
    const source = input();
    source.mediumRaw.cards[0]!.faces.front.file = "02_DD_CARDS_COREBOX/monster.pdf";
    expect(() => buildWealdLevelOneMonsters(source)).toThrow();
    const mismatched = input();
    mismatched.mediumRaw.cards[0]!.faces.back!.page = 2;
    expect(() => buildWealdLevelOneMonsters(mismatched)).toThrow();
    const parsedSource = input();
    Object.assign(parsedSource.mediumParsed, { source: "raw/corebox/monster_medium.json" });
    expect(() => buildWealdLevelOneMonsters(parsedSource)).toThrow();
    const missingLargeCopy = input();
    missingLargeCopy.largeRaw.cards[0]!.pages = [1];
    missingLargeCopy.largeRaw.cards[0]!.copies = 1;
    expect(() => buildWealdLevelOneMonsters(missingLargeCopy)).toThrow();
  });
});
