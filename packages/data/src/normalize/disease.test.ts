import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import { diseaseFileSchema } from "../disease";
import { buildDiseases } from "./disease";
import { loadNormalizedCorebox } from "./write";
const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(read("extract/corebox/raw/disease.json"));
const dictionary = iconDictionarySchema.parse(read("dictionary/icon-dictionary-v1.8.json"));
const built = buildDiseases(raw, dictionary);
it("完整 11 张疾病目录匹配官方 R27–28，独立锁定触发与印刷数值", () => {
  expect(built.cards.map((c) => [c.name, c.rule.trigger, c.rule.effects])).toEqual([
    [
      "Black Plague",
      "blightToApply",
      [
        { type: "status", kind: "blight", amount: 1, duration: 2 },
        { type: "wounds", amount: 2, perHeroLevel: true },
      ],
    ],
    [
      "Bulimic",
      "foodConsumed",
      [
        { type: "discardFood", count: 1, ifAny: true },
        { type: "stress", amount: 1 },
      ],
    ],
    ["Ennui", "resolveTested", [{ type: "virtueChance", amount: -1 }]],
    [
      "Hemophilia",
      "bleedToApply",
      [
        { type: "status", kind: "bleed", amount: 1, duration: 2 },
        { type: "wounds", amount: 2, perHeroLevel: true },
      ],
    ],
    ["Lethargy", "moveAction", [{ type: "wounds", amount: 1, perHeroLevel: true }]],
    ["Syphilis", "damageTaken", [{ type: "wounds", amount: 1, perHeroLevel: true }]],
    ["Vertigo", "shuffled", [{ type: "stress", amount: 2 }]],
    [
      "The Worries",
      "stressSuffered",
      [
        { type: "stress", amount: 1 },
        { type: "wounds", amount: 2, perHeroLevel: false },
      ],
    ],
    [
      "Creeping Cough",
      "rubbleResolved",
      [{ type: "status", kind: "bleed", amount: 1, duration: 4 }],
    ],
    ["Tapeworm", "hungerResolved", [{ type: "status", kind: "bleed", amount: 1, duration: 4 }]],
    ["Spotted Fever", "damageTaken", [{ type: "status", kind: "blight", amount: 1, duration: 2 }]],
  ]);
  expect(built.cards.map((c) => c.rule.source.page)).toEqual([
    27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ]);
});
it("不命名未知卡面图标、不清验证原因；可再生 JSON 与管线一致", () => {
  const before = structuredClone({ raw, dictionary });
  expect(built.cards[0]!.verification.unverified).toBe(true);
  expect(built.cards[0]!.icons.find((i) => i.iconId === "59cefe7f08")).toMatchObject({
    naming: "unverified",
    key: "unknown_59cefe7f08",
  });
  expect(buildDiseases(raw, dictionary)).toEqual(built);
  expect(loadNormalizedCorebox().disease).toEqual(built);
  expect(read("normalized/corebox/disease.json")).toEqual(built);
  expect({ raw, dictionary }).toEqual(before);
});
it("缺牌、重复牌、假身份 / 数值 / 规则页码及原始来源漂移都拒绝", () => {
  for (const bad of [
    {
      ...built,
      cards: built.cards.map((c, i) =>
        i === 0 ? { ...c, verification: { unverified: false, reasons: [] } } : c,
      ),
    },
    { ...built, cards: built.cards.slice(1) },
    { ...built, cards: built.cards.map((c, i) => (i === 1 ? built.cards[0] : c)) },
    {
      ...built,
      cards: built.cards.map((c, i) =>
        i === 0
          ? {
              ...c,
              rule: { ...c.rule, effects: [{ type: "wounds", amount: 1, perHeroLevel: true }] },
            }
          : c,
      ),
    },
    {
      ...built,
      cards: built.cards.map((c, i) =>
        i === 0 ? { ...c, rule: { ...c.rule, source: { ...c.rule.source, page: 28 } } } : c,
      ),
    },
  ])
    expect(diseaseFileSchema.safeParse(bad).success).toBe(false);
  const changed = structuredClone(raw);
  changed.cards[0]!.faces.front.lines[0]!.text = "wrong";
  expect(() => buildDiseases(changed, dictionary)).toThrow("身份漂移");
  expect(() => buildDiseases({ ...raw, cards: raw.cards.slice(1) }, dictionary)).toThrow("11 张");
});
