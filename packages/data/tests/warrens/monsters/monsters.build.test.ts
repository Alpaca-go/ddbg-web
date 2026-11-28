import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { iconDictionarySchema } from "../../../src/shared/dictionary/schema";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import {
  buildWarrensNormalMonsters,
  WARRENS_NORMAL_MONSTER_IDENTITIES,
} from "../../../src/warrens/monsters/monsters.build";
import {
  loadNormalizedWarrensNormalMonsters,
  writeNormalizedWarrensNormalMonsters,
} from "../../../src/warrens/write";

const root = new URL("../../../", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

function input() {
  return {
    mediumRaw: rawFileSchema.parse(read("extract/extension/warrens/raw/monster_medium.json")),
    largeRaw: rawFileSchema.parse(read("extract/extension/warrens/raw/monster_large.json")),
    mediumParsed: read("extract/extension/warrens/parsed/monster_medium.json"),
    largeParsed: read("extract/extension/warrens/parsed/monster_large.json"),
    dictionary: iconDictionarySchema.parse(read("dictionary/icon-dictionary-v1.8.json")),
  };
}

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWarrensNormalMonsters();
const built = loadNormalizedWarrensNormalMonsters();

describe("Warrens 普通中型/大型怪物规范化", () => {
  it("重建结果与提交文件一致，来源指向 Warrens 印刷目录", () => {
    for (const [name, file] of Object.entries(built)) {
      expect(file).toEqual(read(`normalized/extension/warrens/${name}.json`));
      expect(file.sources.raw).toBe(`extract/extension/warrens/raw/${name}.json`);
      expect(file.sources.parsed).toBe(`extract/extension/warrens/parsed/${name}.json`);
    }
  });

  it("只纳入普通牌堆与一张大型战斗卡，不混入 Boss / Wilbur / Flesh", () => {
    const expectedPages = WARRENS_NORMAL_MONSTER_IDENTITIES.filter((e) =>
      e.id.startsWith("monster_medium:"),
    ).flatMap((e) => e.pages);
    expect(built.monster_medium.cards.flatMap((card) => card.pages).sort((a, b) => a - b)).toEqual(
      expectedPages,
    );
    expect(built.monster_large.cards).toHaveLength(1);
    expect(built.monster_large.cards[0]?.id).toBe("monster_large:warrens:p001");
    const names = new Set([
      ...built.monster_medium.cards.map((c) => c.name),
      ...built.monster_large.cards.map((c) => c.name),
    ]);
    expect(names).toEqual(
      new Set([
        "Swine Chopper",
        "Swine Slasher",
        "Swine Wretch",
        "Swine Drummer",
        "Carrion Eater",
        "Large Carrion Eater",
        "Swine Skiver",
        "Swinetaur",
      ]),
    );
    const reference = built.monster_medium.cards.find(
      (c) => c.id === "monster_medium:warrens:p016",
    );
    expect(reference && "card_kind" in reference).toBe(true);
    for (const card of built.monster_medium.cards.filter((c) => !("card_kind" in c))) {
      expect(card.verification.unverified).toBe(true);
      expect("skills" in card).toBe(true);
    }
  });

  it("篡改身份表或来源应拒绝构建", () => {
    const source = input();
    expect(() => buildWarrensNormalMonsters(source)).not.toThrow();
    const badName = structuredClone(source);
    (badName.mediumParsed as { cards: { id: string; name: string }[] }).cards.find(
      (c) => c.id === "monster_medium:warrens:p001",
    )!.name = "X";
    expect(() => buildWarrensNormalMonsters(badName)).toThrow();
  });
});
