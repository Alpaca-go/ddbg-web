import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import mediumData from "../../normalized/corebox/monster_medium.json";
import regularPool from "../../normalized/corebox/monster_pool.json";
import { rawFileSchema } from "../extract/raw";
import { normalizedMonsterMediumFileSchema } from "./schema";
import { buildDarkestMonsterPool } from "./darkest-monster-pool";
import {
  darkestDungeonMonsterInstances,
  darkestMonsterPoolFileSchema,
} from "../darkest-monster-pool";
import { loadNormalizedCorebox } from "./write";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/monster_medium.json", import.meta.url), "utf8"),
  ),
);
const medium = normalizedMonsterMediumFileSchema.parse(mediumData);
const built = buildDarkestMonsterPool(raw, medium);
const target = new URL("../../normalized/corebox/darkest_monster_pool.json", import.meta.url);
// 沿现有 normalize.test.ts 的生成约定，只写本批新目录，避免顺带改写历史快照。
if (process.env.WRITE_DARKEST_POOL === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);
const committed = darkestMonsterPoolFileSchema.parse(JSON.parse(readFileSync(target, "utf8")));

it("九种26张最暗普通怪物可再生，独立牌组不混入Common/Ruins、Boss或召唤物", () => {
  const before = JSON.stringify({ raw, medium });
  expect(built).toEqual(committed);
  expect(loadNormalizedCorebox().darkest_monster_pool).toEqual(committed);
  const instances = darkestDungeonMonsterInstances(built);
  expect(instances).toHaveLength(26);
  expect(new Set(instances.map((c) => c.instanceId)).size).toBe(26);
  expect(instances.filter((c) => c.edge === "front")).toHaveLength(14);
  expect(instances.filter((c) => c.edge === "back")).toHaveLength(12);
  expect(instances.some((c) => regularPool.cards.some((r) => r.combatCardId === c.cardId))).toBe(
    false,
  );
  expect(instances.some((c) => Number(c.instanceId.split("p")[1]) >= 89)).toBe(false);
  expect(
    built.cards.every((c) => c.level === 3 && c.location === "darkestDungeon" && !c.battleReady),
  ).toBe(true);
  expect(
    built.cards.every(
      (c) =>
        c.missingBattleFields.includes("speed") && c.missingBattleFields.includes("stanceGroups"),
    ),
  ).toBe(true);
  expect(instances.every((c) => !("verified" in c))).toBe(true);
  expect(JSON.stringify({ raw, medium })).toBe(before);
});

it("缺牌、重复份数、错等级/排位、混入召唤物与伪称战斗就绪均拒绝", () => {
  const patch = (fields: object) => ({
    ...built,
    cards: [{ ...built.cards[0]!, ...fields }, ...built.cards.slice(1)],
  });
  for (const invalid of [
    { ...built, cards: built.cards.slice(1) },
    patch({ pages: [63, 64, 64] }),
    patch({ level: 2 }),
    patch({ edge: "back" }),
    patch({ battleReady: true }),
    patch({ id: "monster_medium:p104", combatCardId: "monster_medium:p104" }),
  ])
    expect(darkestMonsterPoolFileSchema.safeParse(invalid).success).toBe(false);
  const first = raw.cards.find((c) => c.id === "monster_medium:p063")!;
  const rawWith = (fields: object) => ({
    ...raw,
    cards: raw.cards.map((c) => (c === first ? { ...c, ...fields } : c)),
  });
  expect(() => buildDarkestMonsterPool(rawWith({ copies: 2 }), medium)).toThrow();
  expect(() =>
    buildDarkestMonsterPool(
      rawWith({ faces: { ...first.faces, front: { ...first.faces.front, file: "other.pdf" } } }),
      medium,
    ),
  ).toThrow();
  expect(() =>
    buildDarkestMonsterPool(raw, {
      ...medium,
      cards: medium.cards.map((c) => (c.id === first.id ? { ...c, front_icons: [] } : c)),
    }),
  ).toThrow();
});
