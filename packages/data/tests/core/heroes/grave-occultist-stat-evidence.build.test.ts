import { printSourceIcon, printIcon } from "../../../src/shared/print-icons";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { iconDictionarySchema } from "../../../src/shared/dictionary/schema";
import { buildHeroStats } from "../../../src/core/heroes/hero-stat.build";

const json = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(json("extract/corebox/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));
const built = buildHeroStats(raw, dictionary);

const LIFE = printIcon("life", 34);
const DODGE = printIcon("dodge", 33);
const SPEED = printIcon("speed", 4);

/** Q-97/R-095：印刷数字与限定防御入库后仍保留词典 unreviewed（不改全局）。 */
const PRINT_FACES = [
  ["hero_stat:p017", "front", "GRAVE ROBBER", "I", 11, 1, 3],
  ["hero_stat:p017", "back", "GRAVE ROBBER", "II", 15, 2, 3],
  ["hero_stat:p018", "front", "GRAVE ROBBER", "III", 19, 3, 3],
  ["hero_stat:p019", "front", "OCCULTIST", "I", 10, 1, 2],
  ["hero_stat:p019", "back", "OCCULTIST", "II", 14, 2, 2],
  ["hero_stat:p020", "front", "OCCULTIST", "III", 18, 3, 3],
] as const;

const LIMITED_ICONS = [
  printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"),
  printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p011:front:10"),
  printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p019:back:10"),
] as const;

function face(rawId: string, side: "front" | "back") {
  const card = raw.cards.find((c) => c.id === rawId)!;
  return card.faces[side]!;
}

function printedNumber(f: NonNullable<ReturnType<typeof face>>, iconId: string) {
  const placements = f.icons.filter((i) => i.iconId === iconId && !i.decor);
  expect(placements).toHaveLength(1);
  const [left, top, right, bottom] = placements[0]!.bbox;
  const numbers = f.spans.filter((span) => {
    const x = (span.bbox[0] + span.bbox[2]) / 2;
    const y = (span.bbox[1] + span.bbox[3]) / 2;
    return /^\d+$/.test(span.t) && x >= left && x <= right && y >= top && y <= bottom;
  });
  expect(numbers).toHaveLength(1);
  return Number(numbers[0]!.t);
}

function speedCount(f: NonNullable<ReturnType<typeof face>>) {
  const life = f.icons.find((i) => i.iconId === LIFE && !i.decor)!;
  const [, top, right, bottom] = life.bbox;
  return f.icons.filter((icon) => {
    const y = (icon.bbox[1] + icon.bbox[3]) / 2;
    return icon.iconId === SPEED && !icon.decor && icon.bbox[0] >= right && y >= top && y <= bottom;
  }).length;
}

it("印刷raw六面Life/Dodge/Speed与身份交叉核实；R-095后六面入库且attributesVerified", () => {
  for (const [rawId, side, name, levelMark, life, dodge, speed] of PRINT_FACES) {
    const f = face(rawId, side);
    expect(f.spans.some((s) => s.t === name)).toBe(true);
    expect(f.spans.some((s) => s.t === levelMark)).toBe(true);
    expect(printedNumber(f, LIFE)).toBe(life);
    expect(printedNumber(f, DODGE)).toBe(dodge);
    expect(speedCount(f)).toBe(speed);
  }
  const cards = built.cards.filter((c) => ["GRAVE ROBBER", "OCCULTIST"].includes(c.name));
  expect(cards).toHaveLength(6);
  expect(
    cards.every((c) => c.attributesVerified && c.approval === "kyries_review_2026-10-18"),
  ).toBe(true);
  expect(built.cards).toHaveLength(33);
  expect(built.cards.filter((c) => c.name === "JESTER")).toHaveLength(3);
});

it("三枚限定图标保持词典unreviewed；左右栏与印刷一致；Jester同hash不入库（R-048/R-095）", () => {
  for (const iconId of LIMITED_ICONS) {
    expect(dictionary.icons.find((i) => i.iconId === iconId)).toMatchObject({
      status: "unreviewed",
      key: `unknown_${iconId}`,
    });
  }
  expect(
    face("hero_stat:p011", "front").icons.some(
      (i) => i.iconId === printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p011:front:10"),
    ),
  ).toBe(true);
  const defence: ReadonlyArray<readonly [string, "front" | "back", readonly string[]]> = [
    ["hero_stat:p017", "front", [printIcon("blight", 219)]],
    [
      "hero_stat:p017",
      "back",
      [
        printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"),
        printIcon("debuff", 344),
      ],
    ],
    [
      "hero_stat:p018",
      "front",
      [
        printIcon("bleed", 299),
        printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"),
        printIcon("debuff", 344),
      ],
    ],
    [
      "hero_stat:p019",
      "front",
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p011:front:10")],
    ],
    [
      "hero_stat:p019",
      "back",
      [
        printIcon("bleed", 299),
        printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p019:back:10"),
      ],
    ],
    [
      "hero_stat:p020",
      "front",
      [
        printIcon("bleed", 299),
        printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"),
        printIcon("debuff", 344),
      ],
    ],
  ];
  for (const [rawId, side, icons] of defence) {
    const f = face(rawId, side);
    const label = f.spans.filter((s) => s.t === "Resistances        Immunities");
    const hamlet = f.spans.filter((s) => s.t === "Hamlet Skill:");
    expect(label).toHaveLength(1);
    expect(hamlet).toHaveLength(1);
    const [left, , right, bottom] = label[0]!.bbox;
    const split = (left + right) / 2;
    const top = hamlet[0]!.bbox[1];
    const frame = f.icons
      .filter(
        (i) =>
          !i.decor &&
          (i.bbox[0] + i.bbox[2]) / 2 >= left &&
          (i.bbox[0] + i.bbox[2]) / 2 <= right &&
          (i.bbox[1] + i.bbox[3]) / 2 > bottom &&
          (i.bbox[1] + i.bbox[3]) / 2 < top,
      )
      .sort((a, b) => a.bbox[0] - b.bbox[0]);
    expect(frame.every((i) => (i.bbox[0] + i.bbox[2]) / 2 < split)).toBe(true);
    expect(frame.map((i) => i.iconId)).toEqual([...icons]);
  }
});
