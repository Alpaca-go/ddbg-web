import { expect, it } from "vitest";
import raw from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import {
  createTrinketPool,
  drawTrinket,
  chooseTrinket,
  trinketOptions,
  trinketPoolProblem,
} from "./trinket-acquisition";
const cards = normalizedTrinketFileSchema.parse(raw).cards;
const heroes = [
  { id: "a", level: 1 },
  { id: "b", level: 1 },
];
it("完整 38 张来源分级为 14 / 12 / 12；未知卡不删，种子洗牌只一次，输入不变", () => {
  for (const level of [1, 2, 3] as const) {
    const pool = createTrinketPool(cards, level),
      before = structuredClone(pool);
    const first = drawTrinket(pool, heroes, "a", 1, 38);
    if (first.status !== "resolved") throw new Error(first.reason);
    expect(pool).toEqual(before);
    expect(pool.cards).toHaveLength(level === 1 ? 14 : 12);
    expect(first.cursor).toBe(38 + pool.cards.length - 1);
    expect(drawTrinket(pool, heroes, "a", 1, 38)).toEqual(first);
    expect(trinketPoolProblem(first.pool, heroes)).toBeNull();
    const discarded = chooseTrinket(first.pool, heroes, "discard-new");
    if (discarded.status !== "resolved") throw new Error(discarded.reason);
    const second = drawTrinket(discarded.pool, heroes, "a", 1, first.cursor);
    if (second.status !== "resolved") throw new Error(second.reason);
    expect(second.cursor).toBe(first.cursor);
    expect(second.pool.incoming!.cardId).not.toBe(first.pool.incoming!.cardId);
  }
  expect(() =>
    createTrinketPool(
      cards.filter((c) => !c.verification.unverified),
      1,
    ),
  ).toThrow();
});
it("R26 携带上限与转交旧饰品：保留旧面、新装备正面；不囤积、不转给死亡英雄", () => {
  const base = createTrinketPool(cards, 1);
  const pool = {
    ...base,
    deck: base.cards
      .map((c) => c.id)
      .filter((id) => !["trinket:p001", "trinket:p006"].includes(id)),
    held: [{ cardId: "trinket:p001", heroId: "a", face: "inverted" as const }],
    incoming: { cardId: "trinket:p006", actorId: "a" },
  };
  expect(trinketOptions(pool, heroes).map((o) => o.id)).toEqual([
    "discard-new",
    "equip:b",
    "discard:trinket:p001",
    "transfer:trinket:p001:b",
  ]);
  expect(chooseTrinket(pool, heroes, "equip:a").status).toBe("refused");
  const moved = chooseTrinket(pool, heroes, "transfer:trinket:p001:b");
  if (moved.status !== "resolved") throw new Error(moved.reason);
  expect(moved.pool.held[0]!.face).toBe("inverted");
  const done = chooseTrinket(moved.pool, heroes, "equip:a");
  if (done.status !== "resolved") throw new Error(done.reason);
  expect(done.pool.held).toContainEqual({ cardId: "trinket:p006", heroId: "a", face: "upright" });
  expect(done.pool.incoming).toBeNull();
  expect(trinketPoolProblem(done.pool, heroes)).toBeNull();
  expect(
    trinketOptions(pool, [{ ...heroes[0]! }, { ...heroes[1]!, dead: true }]).some((o) =>
      o.id.endsWith(":b"),
    ),
  ).toBe(false);
  const freed = chooseTrinket(pool, heroes, "discard:trinket:p001");
  if (freed.status !== "resolved") throw new Error(freed.reason);
  expect(freed.pool.discard).toEqual(["trinket:p001"]);
  expect(freed.pool.incoming).toEqual(pool.incoming);
});
it("R-048 未复核卡保留真实抽取，不装备、不解读；可明确弃新卡", () => {
  const base = createTrinketPool(cards, 1);
  const pool = {
    ...base,
    deck: ["trinket:p009", ...base.cards.map((c) => c.id).filter((id) => id !== "trinket:p009")],
  };
  const drawn = drawTrinket(pool, heroes, "a", 1, 38);
  if (drawn.status !== "resolved") throw new Error(drawn.reason);
  expect(drawn.cursor).toBe(38);
  expect(trinketOptions(drawn.pool, heroes).map((o) => o.id)).toEqual(["discard-new"]);
  expect(chooseTrinket(drawn.pool, heroes, "equip:a").status).toBe("refused");
  const discarded = chooseTrinket(drawn.pool, heroes, "discard-new");
  if (discarded.status !== "resolved") throw new Error(discarded.reason);
  expect(discarded.pool.discard).toEqual(["trinket:p009"]);
  expect(trinketPoolProblem(discarded.pool, heroes)).toBeNull();
});
it("缩减 / 重复 / 耗尽 / 越容拒绝，不从弃牌重洗，不使用未知容量", () => {
  const pool = createTrinketPool(cards, 1);
  for (const bad of [
    { ...pool, cards: pool.cards.slice(1) },
    { ...pool, deck: Array(14).fill("trinket:p001") },
    { ...pool, deck: [], discard: pool.cards.map((c) => c.id) },
  ])
    expect(drawTrinket(bad, heroes, "a", 1, 38).status).toBe("refused");
  expect(drawTrinket(pool, [{ id: "a" }], "a", 1, 38).status).toBe("refused");
});
