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
const cards = built.cards.filter((c) => c.name === "PLAGUE DOCTOR");

it("R-094三面独立黄金值；III从Blight抗性变为Blight/Disease双免疫，旧批准日期不重写", () => {
  expect(
    cards.map((c) => [
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
    ["hero_stat:p013:front", 1, 11, 0, 3, ["blight"], [], "kyries_review_2026-10-17"],
    ["hero_stat:p013:back", 2, 15, 1, 3, ["blight"], ["disease"], "kyries_review_2026-10-17"],
    ["hero_stat:p014:front", 3, 19, 2, 3, [], ["blight", "disease"], "kyries_review_2026-10-17"],
  ]);
  expect(
    cards.every(
      (c) =>
        (c.verified_condition_defence ?? readHigherHeroDefence(c))!.approval ===
        "kyries_review_2026-10-17",
    ),
  ).toBe(true);
  expect(built.cards).toHaveLength(18);
  expect(
    built.cards
      .filter((c) => c.name !== "PLAGUE DOCTOR")
      .every((c) => c.approval !== "kyries_review_2026-10-17"),
  ).toBe(true);
  expect(cards[0]!.verified_buff_defence).toEqual({
    resistant: false,
    immune: false,
    source: "print_front",
  });
});

it("III图标8510428636只在本卡免疫注解解释，raw/词典/整卡未验证原样保留", () => {
  const originalRaw = structuredClone(raw),
    originalDictionary = structuredClone(dictionary);
  expect(dictionary.icons.find((i) => i.iconId === "8510428636")).toMatchObject({
    status: "unreviewed",
    key: "unknown_8510428636",
  });
  expect(cards[2]!.icons.find((i) => i.iconId === "8510428636")).toMatchObject({
    naming: "unverified",
    value: null,
  });
  expect(cards[2]!.verification).toMatchObject({
    unverified: true,
    reasons: expect.arrayContaining(["icon:8510428636"]),
  });
  expect(buildHeroStats(raw, dictionary)).toEqual(built);
  expect(raw).toEqual(originalRaw);
  expect(dictionary).toEqual(originalDictionary);
  expect(
    normalizedHeroStatCardSchema.safeParse({
      ...cards[2]!,
      verification: { unverified: false, reasons: [] },
    }).success,
  ).toBe(false);
});

it("完整防御栏逐面拒绝缺失/重复/左右交换/新增图标；不把III左侧职业徽记当抗性", () => {
  for (const card of cards)
    for (const change of ["missing", "duplicate", "side", "extra"] as const) {
      const changed = structuredClone(raw);
      const face = changed.cards.find((c) => c.id === card.rawId)!.faces[card.face]!;
      const icon = face.icons.find(
        (i) => i.iconId === (card.level === 3 ? "8510428636" : "40bb356305"),
      )!;
      if (change === "missing") face.icons = face.icons.filter((i) => i !== icon);
      if (change === "duplicate") face.icons.push(structuredClone(icon));
      if (change === "side") icon.bbox = card.level === 3 ? [22, 136, 28, 143] : [50, 136, 56, 143];
      if (change === "extra") face.icons.push({ iconId: "0000000000", bbox: [31, 136, 36, 143] });
      expect(() => buildHeroStats(changed, dictionary)).toThrow(/漂移/);
    }
});

it("身份/属性/日期/来源漂移拒绝；两项免疫只允许精确获批III面，不外推其他卡", () => {
  for (const card of cards)
    for (const patch of [
      { name: "JESTER" },
      { life: card.life + 1 },
      { dodge: card.dodge + 1 },
      { speed: 2 },
      { approval: "kyries_review_2026-10-16" },
      { level: card.level + 1 },
      { source: { ...card.source, page: 99 } },
    ])
      expect(normalizedHeroStatCardSchema.safeParse({ ...card, ...patch }).success).toBe(false);
  const third = cards[2]!;
  for (const patch of [
    { resistances: ["blight"] },
    { immunities: ["disease"] },
    { immunities: ["disease", "blight"] },
    { immunities: ["blight", "disease", "stun"] },
    { source: "print_back" },
    { approval: "kyries_review_2026-10-16" },
  ])
    expect(
      normalizedHeroStatCardSchema.safeParse({
        ...third,
        verified_higher_condition_defence: {
          ...third.verified_higher_condition_defence!,
          ...patch,
        },
      }).success,
    ).toBe(false);
  expect(
    readHigherHeroDefence({
      ...cards[1]!,
      verified_higher_condition_defence: third.verified_higher_condition_defence!,
    }),
  ).toBeUndefined();
  expect(built.cards.some((c) => c.id === "hero_stat:p014:back")).toBe(false);
});

it("生成一致且只输出获批面；原始生命数字、移动数量或来源变化均拒绝", () => {
  expect(built).toEqual(json("normalized/corebox/hero_stat.json"));
  for (const card of cards)
    for (const change of ["number", "speed", "page"] as const) {
      const changed = structuredClone(raw);
      const face = changed.cards.find((c) => c.id === card.rawId)!.faces[card.face]!;
      if (change === "number") face.spans.find((s) => s.t === String(card.life))!.t = "99";
      if (change === "speed") face.icons = face.icons.filter((i) => i.iconId !== "4648c9e5ec");
      if (change === "page") face.page = 99;
      expect(() => buildHeroStats(changed, dictionary)).toThrow();
    }
});
