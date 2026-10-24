import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { iconDictionarySchema } from "../dictionary/schema";
import { rawFileSchema } from "../extract/raw";
import {
  approvedCoveHeroStats,
  buildCoveHeroStats,
  coveHeroStatCardSchema,
} from "./cove-hero-stat";
import { loadNormalizedCorebox } from "./write";

const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const json = (rel: string) => JSON.parse(readFileSync(path.join(DATA_ROOT, rel), "utf8"));

const raw = rawFileSchema.parse(json("extract/extension/cove/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));

it("Cove：六面获批 STAT 与 raw 一致", () => {
  const built = buildCoveHeroStats(raw, dictionary);
  expect(built).toHaveLength(approvedCoveHeroStats.length);
  const cases: [string, number, number, number, number][] = [
    ["hero_stat:cove:flagellant:p001:front", 1, 12, 2, 0],
    ["hero_stat:cove:flagellant:p001:back", 2, 16, 3, 0],
    ["hero_stat:cove:flagellant:p002:front", 3, 22, 3, 0],
    ["hero_stat:cove:man-at-arms:p001:front", 1, 16, 1, 1],
    ["hero_stat:cove:man-at-arms:p001:back", 2, 22, 2, 1],
    ["hero_stat:cove:man-at-arms:p002:front", 3, 28, 3, 1],
  ];
  for (const [id, level, life, dodge, speed] of cases) {
    const card = built.find((c) => c.id === id)!;
    expect(card).toBeDefined();
    expect(card.level).toBe(level);
    expect(card.life).toBe(life);
    expect(card.dodge).toBe(dodge);
    expect(card.speed).toBe(speed);
    expect(coveHeroStatCardSchema.safeParse(card).success).toBe(true);
  }
  const file = loadNormalizedCorebox().hero_stat;
  const cove = file.cards.filter((c: { id: string }) => c.id.startsWith("hero_stat:cove:"));
  expect(built).toEqual(cove);
});
