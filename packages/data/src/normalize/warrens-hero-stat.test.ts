import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import {
  approvedWarrensHeroStats,
  buildWarrensHeroStats,
  warrensHeroStatCardSchema,
} from "./warrens-hero-stat";

const json = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(json("extract/extension/warrens/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));
const built = buildWarrensHeroStats(raw, dictionary);

it("R-104：Leper / Antiquarian I–II 黄金值与条件防御；III Antiquarian 待 Q-104 不入库", () => {
  expect(approvedWarrensHeroStats).toHaveLength(5);
  expect(
    built.map((c) => [
      c.id,
      c.level,
      c.life,
      c.dodge,
      c.speed,
      c.verification.unverified,
      c.verified_condition_defence?.resistances ?? null,
    ]),
  ).toEqual([
    ["hero_stat:warrens:leper:p001:front", 1, 18, 0, 1, false, ["stun"]],
    ["hero_stat:warrens:leper:p001:back", 2, 25, 1, 1, false, null],
    ["hero_stat:warrens:leper:p002:front", 3, 33, 2, 1, false, null],
    ["hero_stat:warrens:antiquarian:p001:front", 1, 9, 1, 0, false, null],
    ["hero_stat:warrens:antiquarian:p001:back", 2, 12, 2, 0, true, null],
  ]);
  for (const card of built) expect(warrensHeroStatCardSchema.safeParse(card).success).toBe(true);
});

it("与 committed normalized Warrens 面一致", () => {
  const file = json("normalized/corebox/hero_stat.json");
  const warrens = file.cards.filter((c: { id: string }) => c.id.startsWith("hero_stat:warrens:"));
  expect(built).toEqual(warrens);
});
