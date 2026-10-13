import { expect, it } from "vitest";
import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import {
  conditionPoolProblem,
  createConditionPool,
  gainDisease,
  gainPositiveQuirk,
  replaceConditionQuirk,
} from "./conditions";
import type { ConditionHero, ConditionPool } from "./conditions";
import { applyPassiveHero, applyPassiveStatus } from "./passive-runtime";
import { passiveVirtueThreshold } from "./passive";
import type { PassiveHero } from "./passive-runtime";

const conditionPool = () =>
  createConditionPool(
    diseaseFileSchema.parse(diseases).cards,
    normalizedQuirkFileSchema.parse(quirks).cards,
  );
const holder: PassiveHero = {
  id: "hero",
  heroLevel: 2,
  life: 20,
  wounds: 0,
  stress: 0,
  dead: false,
};

it("R26 正面堆完整 17 张、有限抽取与同种子回放；三负面自动弃新卡", () => {
  const p = conditionPool(),
    heroes = [holder],
    before = structuredClone(p);
  const first = gainPositiveQuirk(p, heroes, holder.id, 11, 7);
  if (first.status !== "resolved") throw new Error(first.reason);
  expect(first.cursor).toBe(23);
  expect(first.pool.positiveDeck).toHaveLength(16);
  expect(first.heroes[0]!.quirkIds).toEqual([first.quirkId]);
  expect(conditionPoolProblem(first.pool, first.heroes)).toBeNull();
  expect(gainPositiveQuirk(p, heroes, holder.id, 11, 7)).toEqual(first);
  expect(p).toEqual(before);
  const second = gainPositiveQuirk(first.pool, first.heroes, holder.id, 11, first.cursor);
  if (second.status !== "resolved") throw new Error(second.reason);
  expect(second.cursor).toBe(first.cursor);
  expect(second.quirkId).not.toBe(first.quirkId);
  expect(conditionPoolProblem(second.pool, second.heroes)).toBeNull();
  const full = gainPositiveQuirk(
    p,
    [{ ...holder, quirkIds: ["quirk:p018", "quirk:p019", "quirk:p020"] }],
    holder.id,
    11,
    7,
  );
  if (full.status !== "resolved") throw new Error(full.reason);
  expect(full.heroes[0]!.dead).toBe(false);
  expect(full.heroes[0]!.quirkIds).toEqual(["quirk:p018", "quirk:p019", "quirk:p020"]);
  expect(full.pool.quirkDiscard).toEqual([full.quirkId]);
  expect(full.replaceOptions).toBeUndefined();
  expect(conditionPoolProblem(full.pool, full.heroes)).toBeNull();
  expect(
    gainPositiveQuirk({ ...p, positiveDeck: ["quirk:p018"] }, heroes, holder.id, 11, 7).status,
  ).toBe("refused");
});
function deckFor(
  heroes: readonly ConditionHero[],
  diseaseFirst = "disease:p002",
  quirkFirst = "quirk:p020",
): ConditionPool {
  const p = conditionPool();
  const order = (ids: string[], first: string) => [
    ...ids.filter((id) => id === first),
    ...ids.filter((id) => id !== first),
  ];
  return {
    ...p,
    diseaseDeck: order(
      p.diseases.filter((c) => !heroes.some((h) => h.diseaseId === c.id)).map((c) => c.id),
      diseaseFirst,
    ),
    negativeDeck: order(
      p.quirks
        .filter((c) => c.polarity === "negative" && !heroes.some((h) => h.quirkIds?.includes(c.id)))
        .map((c) => c.id),
      quirkFirst,
    ),
  };
}
it("完整 11 / 35 实体池：首抽只洗一次；同种子回放，拒绝伪目录 / 脏分区且输入不变", () => {
  const p = conditionPool(),
    heroes = [holder],
    before = structuredClone({ p, heroes });
  const first = gainDisease(p, heroes, "hero", 11, 7);
  expect(first.status).toBe("resolved");
  if (first.status !== "resolved") throw new Error(first.reason);
  expect(first.cursor).toBe(17);
  expect(conditionPoolProblem(first.pool, first.heroes)).toBeNull();
  expect(gainDisease(p, heroes, "hero", 11, 7)).toEqual(first);
  const second = gainDisease(first.pool, first.heroes, "hero", 11, first.cursor);
  if (second.status !== "resolved") throw new Error(second.reason);
  expect(second.cursor).toBe(34); // 疾病不重洗；首次负面堆 18 张只用 17 次 RNG。
  expect(second.pool.diseaseDiscard).toEqual([first.diseaseId]);
  expect(second.heroes[0]!.quirkIds).toEqual([second.quirkId]);
  expect(conditionPoolProblem(second.pool, second.heroes)).toBeNull();
  for (const bad of [
    { ...p, diseases: p.diseases.slice(1) },
    { ...p, diseaseDeck: Array(11).fill(p.diseases[0]!.id) },
    { ...p, quirks: p.quirks.map((c, i) => (i === 17 ? { ...c, name: "made up" } : c)) },
  ])
    expect(gainDisease(bad, heroes, "hero", 11, 7).status).toBe("refused");
  expect({ p, heroes }).toEqual(before);
  expect(gainDisease(p, [holder, holder], holder.id, 11, 7).status).toBe("refused");
});
it("R26 黄金场景：第四张负面必须替换正面；全部负面则永久死亡，仍保持实体守恒", () => {
  const hero = {
    ...holder,
    diseaseId: "disease:p001",
    quirkIds: ["quirk:p001", "quirk:p002", "quirk:p018"],
  };
  const acquired = gainDisease(deckFor([hero]), [hero], hero.id, 11, 0);
  if (acquired.status !== "resolved") throw new Error(acquired.reason);
  expect(acquired.replaceOptions).toEqual(["quirk:p001", "quirk:p002"]);
  expect(conditionPoolProblem(acquired.pool, acquired.heroes)).toBeNull();
  expect(replaceConditionQuirk(acquired.pool, acquired.heroes, "quirk:p018").status).toBe(
    "refused",
  );
  const replaced = replaceConditionQuirk(acquired.pool, acquired.heroes, "quirk:p002");
  if (replaced.status !== "resolved") throw new Error(replaced.reason);
  expect(replaced.heroes[0]!.quirkIds).toEqual(["quirk:p001", "quirk:p020", "quirk:p018"]);
  expect(replaced.pool.quirkDiscard).toEqual(["quirk:p002"]);
  expect(conditionPoolProblem(replaced.pool, replaced.heroes)).toBeNull();
  const negative = { ...hero, quirkIds: ["quirk:p018", "quirk:p019", "quirk:p020"] };
  const mad = gainDisease(
    deckFor([negative], "disease:p002", "quirk:p021"),
    [negative],
    negative.id,
    11,
    0,
  );
  if (mad.status !== "resolved") throw new Error(mad.reason);
  expect(mad.heroes[0]).toMatchObject({ dead: true, deathReason: "madness" });
  expect(mad.pool.quirkDiscard).toContain("quirk:p021");
  expect(conditionPoolProblem(mad.pool, mad.heroes)).toBeNull();
});
it("抽空不洗弃牌；重复感染缺负面牌时整次拒绝，不提交半次替换", () => {
  const hero = { ...holder, diseaseId: "disease:p001" },
    p = deckFor([hero]);
  const empty = { ...p, negativeDeck: [], quirkDiscard: p.negativeDeck! };
  const before = structuredClone(empty);
  expect(gainDisease(empty, [hero], hero.id, 11, 0)).toMatchObject({
    status: "refused",
    reason: expect.stringContaining("耗尽"),
  });
  expect(empty).toEqual(before);
});
it("R-063：Anemic + Hemophilia 每次施加各一次，追加状态逐堆受抗性；免疫不触发", () => {
  const hero = { ...holder, diseaseId: "disease:p004", quirkIds: ["quirk:p018"] };
  const applied = applyPassiveStatus(hero, { kind: "bleed", amount: 2, duration: 2 }, "target", {
    resistances: ["bleed"],
    immunities: [],
  });
  if (applied.status !== "resolved") throw new Error(applied.reason);
  expect(applied.hero.statusStacks).toEqual([
    { kind: "bleed", amount: 2, remaining: 1 },
    { kind: "bleed", amount: 1, remaining: 2 },
    { kind: "bleed", amount: 1, remaining: 1 },
  ]);
  expect(applied.wounds).toEqual([4]);
  const immune = applyPassiveStatus(hero, { kind: "bleed", amount: 2, duration: 2 }, "target", {
    resistances: [],
    immunities: ["bleed"],
  });
  expect(immune).toMatchObject({ status: "resolved", wounds: [], hero: { statusStacks: [] } });
  const reduced = applyPassiveStatus(
    { ...hero, quirkIds: ["quirk:p001", "quirk:p018"] },
    { kind: "bleed", amount: 2, duration: 2 },
    "target",
    { resistances: ["bleed"], immunities: [] },
  );
  expect(reduced).toMatchObject({ status: "resolved", wounds: [], hero: { statusStacks: [] } });
  const self = applyPassiveStatus(hero, { kind: "bleed", amount: 2, duration: 2 }, "self", {
    resistances: ["bleed"],
    immunities: [],
  });
  expect(self).toMatchObject({
    status: "resolved",
    wounds: [4],
    hero: {
      statusStacks: [
        { kind: "bleed", amount: 2, remaining: 2 },
        { kind: "bleed", amount: 1, remaining: 2 },
        { kind: "bleed", amount: 1, remaining: 1 },
      ],
    },
  });
  expect(applyPassiveStatus(hero, { kind: "bleed", amount: 2, duration: 2 }, "self").status).toBe(
    "refused",
  );
});
it("The Worries + Nervous + Soft 与低光按压力事件加总一次，伤口先于意志（R-069）", () => {
  const hero = { ...holder, diseaseId: "disease:p008", quirkIds: ["quirk:p028", "quirk:p035"] };
  const result = applyPassiveHero(hero, { type: "stress", amount: 2 }, 1, 0, 2);
  expect(result).toMatchObject({ status: "resolved", cursor: 0, hero: { stress: 5, wounds: 4 } });
  const blocked = applyPassiveHero({ ...hero, stress: 5 }, { type: "stress", amount: 2 }, 1, 0, 2);
  expect(blocked).toMatchObject({ status: "resolved", cursor: 0, hero: { stress: 10, wounds: 4 } });
  expect(hero.wounds).toBe(0);
});
it("Bulimic 丢另一 Food 一次，Stress Eater 加压独立触发；弃 Food 不递归消耗", () => {
  const hero = { ...holder, diseaseId: "disease:p002", quirkIds: ["quirk:p029"] };
  const result = applyPassiveHero(hero, "foodConsumed", 1, 0, 5, [
    { id: "spare", face: "food" },
    { id: "torch", face: "torch" },
  ]);
  expect(result).toMatchObject({
    status: "resolved",
    hero: { stress: 2 },
    provisions: [{ id: "torch", face: "torch" }],
  });
  if (result.status === "resolved")
    expect(result.events.filter((e) => e.type === "provisionConsumed")).toHaveLength(1);
});
it("Creeping Cough / Tapeworm：持续 4t 抗性减 Nt，伤口不触发 takes Damage；Ennui 和 Mercurial 改真实阈值", () => {
  for (const [id, trigger] of [
    ["disease:p009", "rubbleResolved"],
    ["disease:p010", "hungerResolved"],
  ] as const) {
    const result = applyPassiveHero({ ...holder, diseaseId: id }, trigger, 1, 0, 5, [], {
      resistances: ["bleed"],
      immunities: [],
    });
    expect(result).toMatchObject({
      status: "resolved",
      hero: { wounds: 0, statusStacks: [{ kind: "bleed", remaining: 3, amount: 1 }] },
    });
  }
  const wound = applyPassiveHero(
    { ...holder, diseaseId: "disease:p006", quirkIds: ["quirk:p020", "quirk:p031"] },
    { type: "stress", amount: 0, woundAmounts: [2] },
    1,
    0,
    5,
  );
  expect(wound).toMatchObject({ status: "resolved", hero: { wounds: 2 } });
  if (wound.status === "resolved") expect(wound.hero.statusStacks).toBeUndefined();
  expect(passiveVirtueThreshold({ diseaseId: "disease:p003" })).toBe(1);
  expect(passiveVirtueThreshold({ diseaseId: "disease:p003", quirkIds: ["quirk:p024"] })).toBe(0);
});
