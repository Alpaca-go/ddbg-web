import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import generated from "../../normalized/corebox/monster_pool.json";
import mediumData from "../../normalized/corebox/monster_medium.json";
import largeData from "../../normalized/corebox/monster_large.json";
import { rawFileSchema } from "../extract/raw";
import { monsterPoolFileSchema, ruinsMonsterPool } from "../monster-pool";
import { normalizedMonsterMediumFileSchema, normalizedMonsterLargeFileSchema } from "./schema";
import { buildMonsterPool } from "./monster-pool";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/monster_medium.json", import.meta.url), "utf8"),
  ),
);
const medium = normalizedMonsterMediumFileSchema.parse(mediumData);
const large = normalizedMonsterLargeFileSchema.parse(largeData);
const file = monsterPoolFileSchema.parse(generated);

it("完整62张可再生，I/II/III=42/11/9；大型抽牌卡映射大型战斗卡而非多加一份", () => {
  expect(buildMonsterPool(raw, medium, large)).toEqual(file);
  expect([1, 2, 3].map((level) => ruinsMonsterPool(file.cards, level).length)).toEqual([42, 11, 9]);
  const pool = ruinsMonsterPool(file.cards, 1);
  expect(new Set(pool.map((c) => c.instanceId)).size).toBe(42);
  expect(pool.filter((c) => c.stanceSlots === 2)).toEqual([
    {
      instanceId: "monster-deck:p030",
      cardId: "monster_large:p002",
      edge: "front",
      stanceSlots: 2,
      verified: true,
    },
  ]);
  expect(file.cards.filter((c) => c.level === 1)).toHaveLength(15);
  expect(
    file.cards
      .filter((c) => c.level === 1 && !c.missingBattleFields.length)
      .flatMap((c) => c.pages),
  ).toHaveLength(42);
  expect(file.cards.find((c) => c.name === "Maggot")!.missingBattleFields).toEqual([]);
  expect(file.cards.find((c) => c.name === "Spitter")!.missingBattleFields).toEqual([]);
  expect(pool.filter((c) => c.cardId === "monster_medium:p031")).toHaveLength(3);
});

it("缺牌、重复份数、错地点/等级/前后排、把大型引用当战斗卡均拒绝", () => {
  const change = (fields: object) => ({
    ...file,
    cards: [{ ...file.cards[0], ...fields }, ...file.cards.slice(1)],
  });
  for (const bad of [
    { ...file, cards: file.cards.slice(1) },
    change({ pages: [1, 2] }),
    change({ pages: [1, 2, 2] }),
    change({ location: "common" }),
    change({ level: 2 }),
    change({ edge: "back" }),
    {
      ...file,
      cards: file.cards.map((c) =>
        c.name === "Brigand Bloodletter" ? { ...c, combatCardId: c.id } : c,
      ),
    },
  ])
    expect(monsterPoolFileSchema.safeParse(bad).success).toBe(false);
  expect(() => ruinsMonsterPool(file.cards, 4)).toThrow();
  for (const patch of [
    { copies: 2 },
    {
      faces: { ...raw.cards[0]!.faces, front: { ...raw.cards[0]!.faces.front, file: "other.pdf" } },
    },
  ]) {
    const changed = { ...raw, cards: [{ ...raw.cards[0]!, ...patch }, ...raw.cards.slice(1)] };
    expect(() => buildMonsterPool(changed, medium, large)).toThrow();
  }
  expect(() => buildMonsterPool(raw, medium, { ...large, cards: [] })).toThrow("对应战斗卡");
});
