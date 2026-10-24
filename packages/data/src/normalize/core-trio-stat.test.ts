import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import { buildHeroStats } from "./hero-stat";
import { readHigherHeroDefence } from "./hero-higher-defence";

const json = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(json("extract/corebox/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));
const built = buildHeroStats(raw, dictionary);

const LIFE = "9534ad5184";
const DODGE = "7a472f5d6f";
const SPEED = "4648c9e5ec";

const PRINT_FACES = [
  ["hero_stat:p011", "front", "JESTER", "I", 10, 2, 3],
  ["hero_stat:p011", "back", "JESTER", "II", 14, 3, 3],
  ["hero_stat:p012", "front", "JESTER", "III", 18, 4, 3],
  ["hero_stat:p015", "front", "ARBALEST", "I", 14, 0, 1],
  ["hero_stat:p015", "back", "ARBALEST", "II", 19, 1, 1],
  ["hero_stat:p016", "front", "ARBALEST", "III", 24, 2, 2],
  ["hero_stat:p021", "front", "ABOMINATION", "I", 13, 1, 2],
  ["hero_stat:p022", "front", "ABOMINATION", "II", 18, 2, 3],
  ["hero_stat:p023", "front", "ABOMINATION", "III", 23, 3, 3],
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

it("印刷 raw 九面 Life/Dodge/Speed 与身份交叉核实；入库 attributesVerified（2026-10-24）", () => {
  for (const [rawId, side, name, levelMark, life, dodge, speed] of PRINT_FACES) {
    const f = face(rawId, side);
    expect(f.spans.some((s) => s.t === name)).toBe(true);
    expect(f.spans.some((s) => s.t === levelMark)).toBe(true);
    expect(printedNumber(f, LIFE)).toBe(life);
    expect(printedNumber(f, DODGE)).toBe(dodge);
    expect(speedCount(f)).toBe(speed);
  }
  const trio = built.cards.filter((c) => ["JESTER", "ARBALEST", "ABOMINATION"].includes(c.name));
  expect(trio).toHaveLength(9);
  expect(trio.every((c) => c.attributesVerified && c.approval === "kyries_review_2026-10-24")).toBe(
    true,
  );
  expect(built.cards).toHaveLength(33);
});

it("九面限定 I 级 / 高等级防御与印刷一致；Jester II/III 未批准 f912c18659 故无 higher 注解", () => {
  expect(
    built.cards
      .filter((c) => c.name === "JESTER")
      .map((c) => [
        c.id,
        c.verified_condition_defence?.resistances ?? null,
        readHigherHeroDefence(c)?.resistances ?? null,
      ]),
  ).toEqual([
    ["hero_stat:p011:front", ["debuff"], null],
    ["hero_stat:p011:back", null, null],
    ["hero_stat:p012:front", null, null],
  ]);
  expect(
    built.cards
      .filter((c) => c.name === "ARBALEST")
      .map((c) => [
        c.id,
        c.verified_condition_defence?.resistances ?? null,
        readHigherHeroDefence(c)?.resistances ?? null,
        readHigherHeroDefence(c)?.immunities ?? null,
      ]),
  ).toEqual([
    ["hero_stat:p015:front", null, null, null],
    ["hero_stat:p015:back", null, ["stun", "shuffle"], []],
    ["hero_stat:p016:front", null, ["stun"], ["shuffle"]],
  ]);
  expect(
    built.cards
      .filter((c) => c.name === "ABOMINATION")
      .map((c) => [
        c.id,
        c.verified_condition_defence?.resistances ?? null,
        readHigherHeroDefence(c)?.resistances ?? null,
        readHigherHeroDefence(c)?.immunities ?? null,
      ]),
  ).toEqual([
    ["hero_stat:p021:front", ["blight"], null, null],
    ["hero_stat:p022:front", null, ["stun", "blight"], []],
    ["hero_stat:p023:front", null, ["stun"], ["blight"]],
  ]);
});

it("与 committed normalized 快照一致", () => {
  const file = json("normalized/corebox/hero_stat.json");
  expect(built).toEqual({
    ...file,
    cards: file.cards.filter((c: { id: string }) => !c.id.startsWith("hero_stat:warrens:")),
  });
});
