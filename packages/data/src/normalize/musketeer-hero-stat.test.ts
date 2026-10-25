import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconDictionarySchema } from "../dictionary/schema";
import { rawFileSchema } from "../extract/raw";
import {
  approvedMusketeerHeroStats,
  buildMusketeerHeroStats,
  musketeerHeroStatCardSchema,
} from "./musketeer-hero-stat";
import { loadNormalizedCorebox } from "./write";

const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const json = (rel: string) => JSON.parse(readFileSync(path.join(DATA_ROOT, rel), "utf8"));

const raw = rawFileSchema.parse(json("extract/extension/musketeer/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));

it("Musketeer：三面获批 STAT 与 raw 一致", () => {
  const built = buildMusketeerHeroStats(raw, dictionary);
  expect(built).toHaveLength(approvedMusketeerHeroStats.length);
  const cases: [string, number, number, number, number][] = [
    ["hero_stat:musketeer:musketeer:p001:front", 1, 14, 0, 1],
    ["hero_stat:musketeer:musketeer:p001:back", 2, 19, 1, 1],
    ["hero_stat:musketeer:musketeer:p002:front", 3, 24, 2, 2],
  ];
  for (const [id, level, life, dodge, speed] of cases) {
    const card = built.find((c) => c.id === id)!;
    expect(card).toBeDefined();
    expect(card.level).toBe(level);
    expect(card.life).toBe(life);
    expect(card.dodge).toBe(dodge);
    expect(card.speed).toBe(speed);
    expect(musketeerHeroStatCardSchema.safeParse(card).success).toBe(true);
  }
  const file = loadNormalizedCorebox().hero_stat;
  const musketeer = file.cards.filter((c: { id: string }) =>
    c.id.startsWith("hero_stat:musketeer:"),
  );
  expect(built).toEqual(musketeer);
});
