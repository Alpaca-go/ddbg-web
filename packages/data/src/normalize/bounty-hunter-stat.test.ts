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
const cards = built.cards.filter((c) => c.name === "BOUNTY HUNTER");

it("R-088三面独立黄金值、完整防御与实际批准日期；旧批准不重写", () => {
  expect(
    cards.map((c) => [
      c.id,
      c.level,
      c.life,
      c.dodge,
      c.speed,
      c.approval,
      c.verified_condition_defence ?? readHigherHeroDefence(c),
    ]),
  ).toEqual([
    [
      "hero_stat:p005:front",
      1,
      14,
      1,
      2,
      "kyries_review_2026-10-16",
      {
        resistances: ["stun"],
        immunities: [],
        source: "print_front",
        approval: "kyries_review_2026-10-16",
      },
    ],
    [
      "hero_stat:p005:back",
      2,
      18,
      2,
      2,
      "kyries_review_2026-10-16",
      {
        resistances: ["stun", "debuff"],
        immunities: [],
        source: "print_back",
        approval: "kyries_review_2026-10-16",
      },
    ],
    [
      "hero_stat:p006:front",
      3,
      23,
      3,
      2,
      "kyries_review_2026-10-16",
      {
        resistances: ["stun", "debuff", "bleed"],
        immunities: [],
        source: "print_front",
        approval: "kyries_review_2026-10-16",
      },
    ],
  ]);
  expect(built.cards.filter((c) => c.name === "BOUNTY HUNTER")).toHaveLength(3);
  expect(
    built.cards
      .filter(
        (c) =>
          ![
            "BOUNTY HUNTER",
            "PLAGUE DOCTOR",
            "GRAVE ROBBER",
            "OCCULTIST",
            "JESTER",
            "ARBALEST",
            "ABOMINATION",
          ].includes(c.name),
      )
      .every((c) => c.approval === "kyries_review_2026-10-10"),
  ).toBe(true);
  expect(cards[0]!.verified_buff_defence).toEqual({
    resistant: false,
    immune: false,
    source: "print_front",
  });
});

it("III限定图标只在该卡左栏解释，整卡未验证与全局词典原样保留", () => {
  const beforeRaw = structuredClone(raw),
    beforeDictionary = structuredClone(dictionary);
  const third = cards[2]!;
  expect(readHigherHeroDefence(third)!.resistances).toEqual(["stun", "debuff", "bleed"]);
  expect(third.icons.find((i) => i.iconId === "c07ea0c507")).toMatchObject({
    naming: "unverified",
    value: null,
  });
  expect(third.verification).toEqual({ unverified: true, reasons: ["icon:c07ea0c507"] });
  expect(dictionary.icons.find((i) => i.iconId === "c07ea0c507")!.status).toBe("unreviewed");
  expect(cards.slice(0, 2).every((c) => !c.verification.unverified)).toBe(true);
  expect(buildHeroStats(raw, dictionary)).toEqual(built);
  expect(raw).toEqual(beforeRaw);
  expect(dictionary).toEqual(beforeDictionary);
});

it("三张完整左右栏逐面守门：缺失、重复、移入免疫栏、未知新增图标均拒绝", () => {
  for (const c of cards)
    for (const change of ["missing", "duplicate", "side", "extra"] as const) {
      const changed = structuredClone(raw),
        face = changed.cards.find((r) => r.id === c.rawId)!.faces[c.face]!;
      const icon = face.icons.find((i) => i.iconId === "8db71542d2")!;
      if (change === "missing") face.icons = face.icons.filter((i) => i !== icon);
      if (change === "duplicate") face.icons.push(structuredClone(icon));
      if (change === "side") icon.bbox = [46, 135, 55, 145];
      if (change === "extra") face.icons.push({ iconId: "0000000000", bbox: [31, 135, 36, 145] });
      expect(() => buildHeroStats(changed, dictionary)).toThrow(/漂移/);
    }
});

it("限定审批不可换英雄、等级、数字、源页或日期，不能把局部获批清成整卡已验证", () => {
  for (const c of cards)
    for (const patch of [
      { life: c.life + 1 },
      { speed: 3 },
      { name: "JESTER" },
      { level: 1 + c.level },
      { approval: "kyries_review_2026-10-10" },
      { source: { ...c.source, page: 99 } },
    ])
      expect(normalizedHeroStatCardSchema.safeParse({ ...c, ...patch }).success).toBe(false);
  const third = cards[2]!;
  for (const patch of [
    { approval: "kyries_review_2026-10-15" },
    { immunities: ["bleed"] },
    { resistances: ["stun", "bleed"] },
    { source: "print_back" },
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
    normalizedHeroStatCardSchema.safeParse({
      ...cards[0]!,
      verified_condition_defence: {
        ...cards[0]!.verified_condition_defence!,
        approval: "kyries_review_2026-10-12",
      },
    }).success,
  ).toBe(false);
  expect(
    normalizedHeroStatCardSchema.safeParse({
      ...third,
      verification: { unverified: false, reasons: [] },
    }).success,
  ).toBe(false);
  const old = built.cards[1]!;
  expect(
    readHigherHeroDefence({
      ...old,
      verified_higher_condition_defence: third.verified_higher_condition_defence!,
    }),
  ).toBeUndefined();
});

it("生成数据含获批面，不生成III背面或Jester；数字/来源漂移拒绝", () => {
  const file = json("normalized/corebox/hero_stat.json");
  expect(built).toEqual({
    ...file,
    cards: file.cards.filter(
      (c: { id: string }) =>
        !c.id.startsWith("hero_stat:warrens:") &&
        !c.id.startsWith("hero_stat:cove:") &&
        !c.id.startsWith("hero_stat:weald:"),
    ),
  });
  expect(built.cards.some((c) => c.rawId === "hero_stat:p006" && c.face === "back")).toBe(false);
  expect(built.cards.some((c) => c.name === "JESTER")).toBe(true);
  for (const c of cards)
    for (const key of ["page", "number", "speed", "name"] as const) {
      const changed = structuredClone(raw),
        face = changed.cards.find((r) => r.id === c.rawId)!.faces[c.face]!;
      if (key === "page") face.page = 99;
      if (key === "number") face.spans.find((s) => s.t === String(c.life))!.t = "99";
      if (key === "speed") face.icons = face.icons.filter((i) => i.iconId !== "4648c9e5ec");
      if (key === "name") face.spans.find((s) => s.t === "BOUNTY HUNTER")!.t = "JESTER";
      expect(() => buildHeroStats(changed, dictionary)).toThrow();
    }
});
