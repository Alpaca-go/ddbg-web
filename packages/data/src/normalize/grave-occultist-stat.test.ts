import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import { buildHeroStats, normalizedHeroStatCardSchema } from "./hero-stat";
import { readHigherHeroDefence } from "./hero-higher-defence";

const json = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(json("extract/corebox/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));
const built = buildHeroStats(raw, dictionary);
const grave = built.cards.filter((c) => c.name === "GRAVE ROBBER");
const occult = built.cards.filter((c) => c.name === "OCCULTIST");

it("R-095六面独立黄金值与限定防御；旧批准日期不重写", () => {
  expect(
    [...grave, ...occult].map((c) => [
      c.id,
      c.level,
      c.life,
      c.dodge,
      c.speed,
      (c.verified_condition_defence ?? readHigherHeroDefence(c))!.resistances,
      (c.verified_condition_defence ?? readHigherHeroDefence(c))!.immunities,
      c.approval,
    ]),
  ).toEqual([
    ["hero_stat:p017:front", 1, 11, 1, 3, ["blight"], [], "kyries_review_2026-10-18"],
    ["hero_stat:p017:back", 2, 15, 2, 3, ["blight", "debuff"], [], "kyries_review_2026-10-18"],
    [
      "hero_stat:p018:front",
      3,
      19,
      3,
      3,
      ["bleed", "blight", "debuff"],
      [],
      "kyries_review_2026-10-18",
    ],
    ["hero_stat:p019:front", 1, 10, 1, 2, ["debuff"], [], "kyries_review_2026-10-18"],
    ["hero_stat:p019:back", 2, 14, 2, 2, ["bleed", "debuff"], [], "kyries_review_2026-10-18"],
    [
      "hero_stat:p020:front",
      3,
      18,
      3,
      3,
      ["bleed", "blight", "debuff"],
      [],
      "kyries_review_2026-10-18",
    ],
  ]);
  expect(built.cards).toHaveLength(33);
  expect(
    built.cards
      .filter((c) => !["GRAVE ROBBER", "OCCULTIST"].includes(c.name))
      .every((c) => c.approval !== "kyries_review_2026-10-18"),
  ).toBe(true);
});

it("限定图标只在获批卡面位置解释，词典/raw/整卡未验证与Jester同hash原样保留", () => {
  const beforeRaw = structuredClone(raw),
    beforeDictionary = structuredClone(dictionary);
  for (const [id, iconId] of [
    ["hero_stat:p017:back", "e61ed317de"],
    ["hero_stat:p018:front", "e61ed317de"],
    ["hero_stat:p019:front", "8cbe7d6703"],
    ["hero_stat:p019:back", "a8c4b25b4e"],
    ["hero_stat:p020:front", "e61ed317de"],
  ] as const) {
    const card = built.cards.find((c) => c.id === id)!;
    expect(card.icons.find((i) => i.iconId === iconId)).toMatchObject({
      naming: "unverified",
      value: null,
    });
    expect(card.verification.reasons).toContain(`icon:${iconId}`);
  }
  expect(dictionary.icons.find((i) => i.iconId === "8cbe7d6703")!.status).toBe("unreviewed");
  expect(buildHeroStats(raw, dictionary)).toEqual(built);
  expect(raw).toEqual(beforeRaw);
  expect(dictionary).toEqual(beforeDictionary);
  expect(
    normalizedHeroStatCardSchema.safeParse({
      ...occult[0]!,
      verification: { unverified: false, reasons: [] },
    }).success,
  ).toBe(false);
});

it("完整防御栏逐面拒绝缺失/重复/左右交换/新增；不外推Jester或日期", () => {
  for (const card of [...grave, ...occult])
    for (const change of ["missing", "duplicate", "side", "extra"] as const) {
      const changed = structuredClone(raw);
      const face = changed.cards.find((c) => c.id === card.rawId)!.faces[card.face]!;
      const target =
        card.id === "hero_stat:p019:front"
          ? "8cbe7d6703"
          : card.id === "hero_stat:p019:back"
            ? "a8c4b25b4e"
            : card.level === 1
              ? "40bb356305"
              : "e61ed317de";
      const icon = face.icons.find((i) => i.iconId === target)!;
      if (change === "missing") face.icons = face.icons.filter((i) => i !== icon);
      if (change === "duplicate") face.icons.push(structuredClone(icon));
      if (change === "side") icon.bbox = [50, 136, 56, 143];
      if (change === "extra") face.icons.push({ iconId: "0000000000", bbox: [31, 136, 36, 143] });
      expect(() => buildHeroStats(changed, dictionary)).toThrow(/漂移/);
    }
  for (const card of occult)
    for (const patch of [
      { name: "JESTER" },
      { approval: "kyries_review_2026-10-17" },
      { life: card.life + 1 },
    ])
      expect(normalizedHeroStatCardSchema.safeParse({ ...card, ...patch }).success).toBe(false);
});
