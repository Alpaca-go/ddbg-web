import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconDictionarySchema } from "../../../src/shared/dictionary/schema";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import {
  approvedMusketeerHeroStats,
  buildMusketeerHeroStats,
} from "../../../src/core/heroes/musketeer-hero-stat.build";
import { loadNormalizedCorebox } from "../../../src/core/write";
import { canonicalHeroStatCardSchema } from "../../../src/core/heroes/hero-stat.build";

const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const json = (rel: string) => JSON.parse(readFileSync(path.join(DATA_ROOT, rel), "utf8"));

const raw = rawFileSchema.parse(json("extract/extension/musketeer/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));

it("Musketeer：三面获批 STAT 与 raw 一致", () => {
  const built = buildMusketeerHeroStats(raw, dictionary);
  expect(built).toHaveLength(approvedMusketeerHeroStats.length);
  const cases: [string, number, number, number, number][] = [
    ["hero_stat:musketeer:h18:p036:front", 1, 14, 0, 1],
    ["hero_stat:musketeer:h18:p036:back", 2, 19, 1, 1],
    ["hero_stat:musketeer:h18:p037:front", 3, 24, 2, 2],
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
  const musketeer = file.cards.filter((c: { id: string }) =>
    c.id.startsWith("hero_stat:musketeer:"),
  );
  expect(built).toEqual(musketeer);
});
