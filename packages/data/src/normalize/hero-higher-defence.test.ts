import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import { buildHeroStats, normalizedHeroStatCardSchema } from "./hero-stat";
import { readHigherHeroDefence, buildHigherHeroDefence } from "./hero-higher-defence";

const json = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(json("extract/corebox/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));
const cards = buildHeroStats(raw, dictionary).cards;

it("R-081八卡独立黄金表：完整左右栏，不把Shuffle/Disease当作持续状态或外推其他卡", () => {
  expect(
    cards
      .filter(
        (c) =>
          c.verified_higher_condition_defence &&
          !["BOUNTY HUNTER", "PLAGUE DOCTOR", "GRAVE ROBBER", "OCCULTIST"].includes(c.name),
      )
      .map((c) => [
        c.id,
        readHigherHeroDefence(c)!.resistances,
        readHigherHeroDefence(c)!.immunities,
      ]),
  ).toEqual([
    ["hero_stat:p001:back", ["stun", "shuffle"], []],
    ["hero_stat:p002:front", ["stun", "debuff"], ["shuffle"]],
    ["hero_stat:p003:back", ["bleed", "blight"], []],
    ["hero_stat:p004:front", ["stun", "bleed", "blight"], []],
    ["hero_stat:p007:back", ["stun", "bleed"], []],
    ["hero_stat:p008:front", ["stun", "bleed", "blight"], []],
    ["hero_stat:p009:back", ["stun", "bleed"], []],
    ["hero_stat:p010:front", ["stun", "bleed"], ["disease"]],
    ["hero_stat:p015:back", ["stun", "shuffle"], []],
    ["hero_stat:p016:front", ["stun"], ["shuffle"]],
    ["hero_stat:p022:front", ["stun", "blight"], []],
    ["hero_stat:p023:front", ["stun"], ["blight"]],
  ]);
  expect(
    cards.filter((c) => c.level === 1).every((c) => !c.verified_higher_condition_defence),
  ).toBe(true);
  expect(
    cards.filter(
      (c) =>
        c.verified_condition_defence &&
        ![
          "PLAGUE DOCTOR",
          "GRAVE ROBBER",
          "OCCULTIST",
          "JESTER",
          "ARBALEST",
          "ABOMINATION",
        ].includes(c.name),
    ),
  ).toHaveLength(5);
  expect(cards.find((c) => c.id === "hero_stat:p001:back")!.verification.reasons).toContain(
    "icon:7034784ee1",
  );
  expect(
    cards
      .find((c) => c.id === "hero_stat:p004:front")!
      .icons.find((i) => i.iconId === "92d117f31a")!.naming,
  ).toBe("unverified");
});
it("生成确定/不突变，图标缺失/重复/跨左右栏/标题漂移及身份漂移拒绝", () => {
  const before = structuredClone(raw);
  expect(buildHeroStats(raw, dictionary).cards).toEqual(cards);
  expect(raw).toEqual(before);
  const original = raw.cards.find((c) => c.id === "hero_stat:p001")!.faces.back!;
  for (const mutate of [
    (face: typeof original) => {
      face.icons = face.icons.filter((i) => i.iconId !== "7034784ee1");
    },
    (face: typeof original) => {
      face.icons.push(structuredClone(face.icons.find((i) => i.iconId === "7034784ee1")!));
    },
    (face: typeof original) => {
      const icon = face.icons.find((i) => i.iconId === "7034784ee1")!;
      icon.bbox = [50, icon.bbox[1], 55, icon.bbox[3]];
    },
    (face: typeof original) => {
      face.spans = face.spans.filter((s) => s.t !== "Resistances        Immunities");
    },
  ]) {
    const face = structuredClone(original);
    mutate(face);
    expect(() => buildHigherHeroDefence("hero_stat:p001:back", face)).toThrow(/R-081/);
  }
  expect(buildHigherHeroDefence("hero_stat:p001:front", original)).toBeUndefined();
});
it("规范化schema与读取拒绝伪造审批/卡级别/免疫栏，不以同名卡或attrsVerified覆盖限定范围", () => {
  const card = cards.find((c) => c.id === "hero_stat:p010:front")!;
  for (const bad of [
    { ...card, name: "CRUSADER" },
    { ...card, level: 2 },
    {
      ...card,
      verified_higher_condition_defence: {
        ...card.verified_higher_condition_defence!,
        source: "print_back",
      },
    },
    {
      ...card,
      verified_higher_condition_defence: {
        ...card.verified_higher_condition_defence!,
        approval: "kyries_review_2026-10-12",
      },
    },
    {
      ...card,
      verified_higher_condition_defence: {
        ...card.verified_higher_condition_defence!,
        immunities: ["shuffle"],
      },
    },
  ]) {
    expect(normalizedHeroStatCardSchema.safeParse(bad).success).toBe(false);
    expect(readHigherHeroDefence(bad as typeof card)).toBeUndefined();
  }
  expect(readHigherHeroDefence({ ...card, attributesVerified: false })).toBeUndefined();
});
