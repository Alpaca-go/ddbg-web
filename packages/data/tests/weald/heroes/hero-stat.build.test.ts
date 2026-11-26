import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconDictionarySchema } from "../../../src/shared/dictionary/schema";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import {
  approvedWealdHeroStats,
  buildWealdHeroStats,
} from "../../../src/weald/heroes/hero-stat.build";
import { loadNormalizedCorebox } from "../../../src/core/write";
import { canonicalHeroStatCardSchema } from "../../../src/core/heroes/hero-stat";

const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const json = (rel: string) => JSON.parse(readFileSync(path.join(DATA_ROOT, rel), "utf8"));

const raw = rawFileSchema.parse(json("extract/extension/weald/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));

it("Weald：六面获批 STAT 与 raw 一致", () => {
  const built = buildWealdHeroStats(raw, dictionary);
  expect(built).toHaveLength(approvedWealdHeroStats.length);
  const cases: [string, number, number, number, number][] = [
    ["hero_stat:weald:h17:p034:front", 1, 11, 1, 2],
    ["hero_stat:weald:h17:p034:back", 2, 15, 2, 2],
    ["hero_stat:weald:h17:p035:front", 3, 19, 3, 2],
    ["hero_stat:weald:h16:p032:front", 1, 11, 1, 2],
    ["hero_stat:weald:h16:p032:back", 2, 15, 2, 2],
    ["hero_stat:weald:h16:p033:front", 3, 19, 3, 3],
  ];
  for (const [id, level, life, dodge, speed] of cases) {
    const card = built.find((c) => c.id === id)!;
    expect(card).toBeDefined();
    expect(card.level).toBe(level);
    expect(card.life).toBe(life);
    expect(card.dodge).toBe(dodge);
    expect(card.speed).toBe(speed);
    expect(canonicalHeroStatCardSchema.safeParse(card).success).toBe(true);
  }
  const file = loadNormalizedCorebox().hero_stat;
  const weald = file.cards.filter((c: { id: string }) => c.id.startsWith("hero_stat:weald:"));
  expect(built).toEqual(weald);
});
