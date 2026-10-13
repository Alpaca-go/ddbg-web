import { expect, it } from "vitest";
import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import {
  createConditionPool,
  conditionPoolProblem,
  gainDisease,
  replaceConditionQuirk,
} from "./conditions";
import { gainNegativeQuirk } from "./index";
import type { ConditionHero, ConditionPool } from "./conditions";

const pool = () =>
  createConditionPool(
    diseaseFileSchema.parse(diseases).cards,
    normalizedQuirkFileSchema.parse(quirks).cards,
  );
const hero: ConditionHero = { id: "hero" };
function ordered(heroes: readonly ConditionHero[], first = "quirk:p021"): ConditionPool {
  const p = pool();
  const available = p.quirks
    .filter((q) => q.polarity === "negative" && !heroes.some((h) => h.quirkIds?.includes(q.id)))
    .map((q) => q.id);
  return { ...p, negativeDeck: [first, ...available.filter((id) => id !== first)] };
}
it("完整18张负面堆首次洗17次；同种子回放、输入不变、后续抽取不重洗", () => {
  const p = pool(),
    heroes = [hero],
    before = structuredClone({ p, heroes });
  const first = gainNegativeQuirk(p, heroes, hero.id, 11, 7);
  if (first.status !== "resolved") throw new Error(first.reason);
  expect(first.cursor).toBe(24);
  expect(first.pool.negativeDeck).toHaveLength(17);
  expect(first.pool.quirks.find((q) => q.id === first.quirkId)?.polarity).toBe("negative");
  expect(first.heroes[0]!.quirkIds).toEqual([first.quirkId]);
  expect(first.pool.positiveDeck).toBeNull();
  expect(first.pool.diseaseDeck).toBeNull();
  expect(first.replaceOptions).toBeUndefined();
  expect(conditionPoolProblem(first.pool, first.heroes)).toBeNull();
  expect(gainNegativeQuirk(p, heroes, hero.id, 11, 7)).toEqual(first);
  expect({ p, heroes }).toEqual(before);
  const second = gainNegativeQuirk(first.pool, first.heroes, hero.id, 11, first.cursor);
  if (second.status !== "resolved") throw new Error(second.reason);
  expect(second.cursor).toBe(first.cursor);
  expect(second.quirkId).toBe(first.pool.negativeDeck![0]);
  expect(second.heroes[0]!.quirkIds).toEqual([first.quirkId, second.quirkId]);
  expect(conditionPoolProblem(second.pool, second.heroes)).toBeNull();
});
it("其他英雄持牌不重抽，第三张直接获得，只修改接收者", () => {
  const party = [
    { ...hero, quirkIds: ["quirk:p001", "quirk:p018"] },
    { id: "other", quirkIds: ["quirk:p019"] },
  ];
  const result = gainNegativeQuirk(ordered(party), party, hero.id, 11, 3);
  if (result.status !== "resolved") throw new Error(result.reason);
  expect(result.heroes[0]!.quirkIds).toEqual(["quirk:p001", "quirk:p018", "quirk:p021"]);
  expect(result.heroes[1]).toBe(party[1]);
  expect(result.pool.negativeDeck).not.toContain("quirk:p019");
  expect(result.cursor).toBe(3);
  expect(conditionPoolProblem(result.pool, result.heroes)).toBeNull();
});
it("R26黄金：第四负面只能替换已有正面，不能弃新负面或旧负面；陈旧选择拒绝", () => {
  const party = [{ ...hero, quirkIds: ["quirk:p001", "quirk:p002", "quirk:p018"] }];
  const result = gainNegativeQuirk(ordered(party), party, hero.id, 11, 0);
  if (result.status !== "resolved") throw new Error(result.reason);
  expect(result.replaceOptions).toEqual(["quirk:p001", "quirk:p002"]);
  expect(result.heroes).toEqual(party);
  expect(result.pool.incomingQuirk).toEqual({ heroId: hero.id, cardId: "quirk:p021" });
  expect(conditionPoolProblem(result.pool, result.heroes)).toBeNull();
  for (const id of ["quirk:p021", "quirk:p018", "missing"])
    expect(replaceConditionQuirk(result.pool, result.heroes, id).status).toBe("refused");
  expect(gainNegativeQuirk(result.pool, result.heroes, hero.id, 11, result.cursor).status).toBe(
    "refused",
  );
  const replaced = replaceConditionQuirk(result.pool, result.heroes, "quirk:p002");
  if (replaced.status !== "resolved") throw new Error(replaced.reason);
  expect(replaced.heroes[0]!.quirkIds).toEqual(["quirk:p001", "quirk:p021", "quirk:p018"]);
  expect(replaced.pool.quirkDiscard).toEqual(["quirk:p002"]);
  expect(replaced.pool.incomingQuirk).toBeUndefined();
  expect(conditionPoolProblem(replaced.pool, replaced.heroes)).toBeNull();
  expect(replaceConditionQuirk(replaced.pool, replaced.heroes, "quirk:p002").status).toBe(
    "refused",
  );
});
it("R26黄金：已有三负面时第四张导致madness永久死亡，保持三卡与全池守恒", () => {
  const party = [{ ...hero, quirkIds: ["quirk:p018", "quirk:p019", "quirk:p020"] }];
  const result = gainNegativeQuirk(ordered(party), party, hero.id, 11, 0);
  if (result.status !== "resolved") throw new Error(result.reason);
  expect(result.heroes[0]).toMatchObject({
    dead: true,
    deathReason: "madness",
    quirkIds: party[0]!.quirkIds,
  });
  expect(result.pool.quirkDiscard).toEqual(["quirk:p021"]);
  expect(result.replaceOptions).toBeUndefined();
  expect(result.cursor).toBe(0);
  expect(conditionPoolProblem(result.pool, result.heroes)).toBeNull();
  expect(gainNegativeQuirk(result.pool, result.heroes, hero.id, 11, 0).status).toBe("refused");
});
it("完整堆抽空后不自动洗回，拒绝不改变牌池/英雄/RNG", () => {
  const p = pool(),
    negative = p.quirks.filter((q) => q.polarity === "negative").map((q) => q.id);
  const empty = { ...p, negativeDeck: [], quirkDiscard: negative },
    before = structuredClone(empty);
  expect(conditionPoolProblem(empty, [hero])).toBeNull();
  expect(gainNegativeQuirk(empty, [hero], hero.id, 11, 7)).toMatchObject({
    status: "refused",
    reason: expect.stringContaining("耗尽"),
  });
  expect(empty).toEqual(before);
});
it("缺完整资料、脏牌堆、重复英雄、死者/缺目标与非法RNG原子拒绝", () => {
  const p = pool(),
    before = structuredClone(p);
  const badPools = [
    { ...p, negativeDeck: undefined } as unknown as ConditionPool,
    { ...p, quirks: p.quirks.slice(1) },
    { ...p, negativeDeck: ["quirk:p001"] },
    { ...p, negativeDeck: Array(18).fill("quirk:p018") },
  ];
  for (const bad of badPools)
    expect(gainNegativeQuirk(bad, [hero], hero.id, 11, 7).status).toBe("refused");
  for (const party of [[hero, hero], [{ ...hero, dead: true }], []])
    expect(gainNegativeQuirk(p, party, hero.id, 11, 7).status).toBe("refused");
  for (const [seed, cursor] of [
    [NaN, 0],
    [1.5, 0],
    [11, -1],
    [11, 0.5],
    [11, Number.MAX_SAFE_INTEGER],
  ])
    expect(gainNegativeQuirk(p, [hero], hero.id, seed!, cursor!).status).toBe("refused");
  const fixed = gainNegativeQuirk(ordered([hero]), [hero], hero.id, 11, Number.MAX_SAFE_INTEGER);
  expect(fixed).toMatchObject({
    status: "resolved",
    cursor: Number.MAX_SAFE_INTEGER,
    quirkId: "quirk:p021",
  });
  expect(p).toEqual(before);
});
it("疾病重复感染复用负面接口，预洗牌的固定结果、游标与选择保持一致", () => {
  const party = [
    { ...hero, diseaseId: "disease:p001", quirkIds: ["quirk:p001", "quirk:p002", "quirk:p018"] },
  ];
  const p = ordered(party);
  const ids = p.diseases.map((c) => c.id).filter((id) => id !== "disease:p001");
  const ready = {
    ...p,
    diseaseDeck: ["disease:p002", ...ids.filter((id) => id !== "disease:p002")],
  };
  const before = structuredClone({ ready, party });
  const result = gainDisease(ready, party, hero.id, 11, 7);
  if (result.status !== "resolved") throw new Error(result.reason);
  expect(result.diseaseId).toBe("disease:p002");
  expect(result.quirkId).toBe("quirk:p021");
  expect(result.cursor).toBe(7);
  expect(result.replaceOptions).toEqual(["quirk:p001", "quirk:p002"]);
  expect(result.pool.diseaseDiscard).toEqual(["disease:p001"]);
  expect(result.heroes[0]!.diseaseId).toBe("disease:p002");
  expect(conditionPoolProblem(result.pool, result.heroes)).toBeNull();
  expect(gainDisease(ready, party, hero.id, 11, 7)).toEqual(result);
  expect({ ready, party }).toEqual(before);
});
