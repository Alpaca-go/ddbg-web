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

it("R-215 + Q-104：Leper / Antiquarian I–III 黄金值；Antiquarian III 免疫 = 位移 + 疾病", () => {
  expect(approvedWarrensHeroStats).toHaveLength(6);
  expect(
    built.map((c) => [
      c.id,
      c.level,
      c.life,
      c.dodge,
      c.speed,
      c.verification.unverified,
      c.verified_higher_condition_defence?.resistances,
    ]),
  ).toEqual([
    ["hero_stat:warrens:leper:p001:front", 1, 18, 0, 1, false, ["debuff"]],
    ["hero_stat:warrens:leper:p001:back", 2, 25, 1, 1, false, ["shuffle", "debuff"]],
    ["hero_stat:warrens:leper:p002:front", 3, 33, 2, 1, false, ["stun", "shuffle", "debuff"]],
    ["hero_stat:warrens:antiquarian:p001:front", 1, 9, 1, 2, false, ["shuffle"]],
    ["hero_stat:warrens:antiquarian:p001:back", 2, 12, 2, 2, true, ["stun", "shuffle"]],
    ["hero_stat:warrens:antiquarian:p002:front", 3, 15, 3, 2, true, ["stun"]],
  ]);
  expect(built.at(-1)?.verified_higher_condition_defence?.immunities).toEqual([
    "shuffle",
    "disease",
  ]);
  for (const card of built) expect(warrensHeroStatCardSchema.safeParse(card).success).toBe(true);
});

it("与 committed normalized Warrens 面一致", () => {
  const file = json("normalized/corebox/hero_stat.json");
  const warrens = file.cards.filter((c: { id: string }) => c.id.startsWith("hero_stat:warrens:"));
  expect(built).toEqual(warrens);
});
