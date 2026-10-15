import { expect, it } from "vitest";
import raw from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import {
  createTrinketPool,
  switchTrinketDungeonLevel,
  chooseTrinket,
  drawTrinket,
  trinketPoolProblem,
} from "./trinket-acquisition";
import type { TrinketPool } from "./trinket-acquisition";
import { recoverHamletPools } from "./hamlet-return-pools";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";

const cards = normalizedTrinketFileSchema.parse(raw).cards;
const heroes = [{ id: "hero-0", level: 1 }];
function switched() {
  const base = createTrinketPool(cards, 1);
  const previous: TrinketPool = {
    ...base,
    held: [{ cardId: "trinket:p001", heroId: "hero-0", face: "inverted" }],
    deck: base.cards.map((c) => c.id).filter((id) => id !== "trinket:p001"),
  };
  const next = switchTrinketDungeonLevel(previous, cards, 2);
  if ("reason" in next) throw new Error(next.reason);
  return next;
}
function incoming(): TrinketPool {
  const pool = switched();
  return {
    ...pool,
    deck: pool.cards.filter((c) => c.level === 2 && c.id !== "trinket:p017").map((c) => c.id),
    incoming: { cardId: "trinket:p017", actorId: "hero-0" },
  };
}
function discardOld() {
  const result = chooseTrinket(incoming(), heroes, "discard:trinket:p001");
  if (result.status !== "resolved") throw new Error(result.reason);
  return result.pool;
}
it("R26/R35：旧级弃装只腾位、不重抽，原新卡装备后I/II各自守恒", () => {
  const pool = incoming(),
    before = structuredClone(pool);
  const freed = discardOld();
  expect(freed.incoming).toEqual(pool.incoming);
  expect(freed.deck).toEqual(pool.deck);
  expect(freed.discard).toEqual([]);
  expect(freed.inactive![0]).toEqual({
    ...pool.inactive![0],
    discard: ["trinket:p001"],
  });
  const done = chooseTrinket(freed, heroes, "equip:hero-0");
  if (done.status !== "resolved") throw new Error(done.reason);
  expect(done.pool.held).toEqual([{ cardId: "trinket:p017", heroId: "hero-0", face: "upright" }]);
  expect(trinketPoolProblem(done.pool, heroes)).toBeNull();
  expect(chooseTrinket(freed, heroes, "discard:trinket:p001").status).toBe("refused");
  expect(pool).toEqual(before);
});
it("II级首次抽牌只洗完整12张，旧池无论牌序如何均不影响概率与游标", () => {
  const pool = switched();
  const first = drawTrinket(pool, heroes, "hero-0", 22, 40);
  const plain = drawTrinket(createTrinketPool(cards, 2), heroes, "hero-0", 22, 40);
  if (first.status !== "resolved" || plain.status !== "resolved") throw new Error("draw refused");
  expect(first.pool.deck).toEqual(plain.pool.deck);
  expect(first.pool.incoming).toEqual(plain.pool.incoming);
  expect(first.cursor).toBe(51);
  expect(first.pool.inactive).toEqual(pool.inactive);
  expect(trinketPoolProblem(first.pool, heroes)).toBeNull();
});
it("R32：回村把旧弃装洗回对应旧池，当前II级牌序不变、确定性回放且不改输入", () => {
  const pool = discardOld();
  const equipped = chooseTrinket(pool, heroes, "equip:hero-0");
  if (equipped.status !== "resolved") throw new Error(equipped.reason);
  const base = createCoreDungeonQuest(
    22,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
  ).dungeon!;
  const dungeon = { ...base, trinkets: equipped.pool };
  const before = structuredClone(dungeon);
  const result = recoverHamletPools(dungeon, 22);
  if (result.status !== "resolved") throw new Error(result.reason);
  const next = result.dungeon.trinkets;
  expect(next.deck).toEqual(equipped.pool.deck);
  expect(next.inactive![0]!.discard).toEqual([]);
  expect([...next.inactive![0]!.deck!].sort()).toEqual(
    cards
      .filter((c) => c.level === 1)
      .map((c) => c.id)
      .sort(),
  );
  expect(result.dungeon.cursor).toBe(base.cursor + 13);
  expect(trinketPoolProblem(next, dungeon.heroes)).toBeNull();
  expect(recoverHamletPools(dungeon, 22)).toEqual(result);
  expect(recoverHamletPools(result.dungeon, 22)).toEqual(result);
  expect(dungeon).toEqual(before);
  const restored = JSON.parse(JSON.stringify(dungeon));
  expect(recoverHamletPools(restored, 22)).toEqual(result);
});
it("旧池缩减、重复、跨级污染或持牌重复在抽牌前拒绝", () => {
  const pool = switched();
  for (const bad of [
    { ...pool, cards: pool.cards.filter((c) => c.id !== "trinket:p002") },
    { ...pool, inactive: [...pool.inactive!, ...pool.inactive!] },
    { ...pool, inactive: [{ ...pool.inactive![0]!, level: 2 as const }] },
    { ...pool, inactive: [{ ...pool.inactive![0]!, deck: [] }] },
    { ...pool, inactive: [{ ...pool.inactive![0]!, discard: ["trinket:p017"] }] },
    { ...pool, inactive: [{ ...pool.inactive![0]!, discard: ["trinket:p001"] }] },
    { ...pool, held: [...pool.held, ...pool.held] },
    { ...pool, discard: ["trinket:p001"] },
  ]) {
    const before = structuredClone(bad);
    expect(trinketPoolProblem(bad, [{ id: "hero-0", level: 3 }])).not.toBeNull();
    expect(drawTrinket(bad, heroes, "hero-0", 22, 40).status).toBe("refused");
    expect(bad).toEqual(before);
  }
});
it("纯池切换II→III保留两级旧池和持牌；不表示已开放正式III级升幕", () => {
  const pool = switched();
  const next = switchTrinketDungeonLevel(pool, cards, 3);
  if ("reason" in next) throw new Error(next.reason);
  expect(next.cards).toHaveLength(38);
  expect(next.inactive!.map((p) => p.level)).toEqual([1, 2]);
  expect(next.held).toEqual(pool.held);
  expect(trinketPoolProblem(next, heroes)).toBeNull();
  const drawn = drawTrinket(next, heroes, "hero-0", 22, 40);
  if (drawn.status !== "resolved") throw new Error(drawn.reason);
  expect(drawn.cursor).toBe(51);
  expect(drawn.pool.cards.find((c) => c.id === drawn.pool.incoming!.cardId)!.level).toBe(3);
});
