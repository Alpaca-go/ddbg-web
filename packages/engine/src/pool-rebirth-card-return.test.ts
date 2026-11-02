import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { returnPoolRebirthCards } from "./pool-rebirth-card-return";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem, switchTrinketDungeonLevel } from "./trinket-acquisition";
import type { FallenHero } from "./fallen-heroes";
import rawTrinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";

function fixture() {
  const d = createCoreDungeonQuest(
    4,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
  ).dungeon!;
  const conditions = d.conditions!,
    trinkets = d.trinkets!;
  const fallen: FallenHero = {
    hero: {
      ...d.heroes[0]!,
      dead: true,
      xp: 7,
      wounds: 4,
      stress: 8,
      diseaseId: conditions.diseases[0]!.id,
      quirkIds: [conditions.quirks.find((q) => q.polarity === "negative")!.id],
      resolveCardId: d.resolveCards[0]!.id,
      resolveTested: true,
    },
    trinkets: [{ heroId: d.heroes[0]!.id, cardId: trinkets.cards[0]!.id, face: "inverted" }],
  };
  return {
    fallen,
    heroes: d.heroes.slice(1),
    pools: {
      conditions,
      trinkets,
      resolveCards: d.resolveCards,
      resolveDecks: d.resolveDecks,
    },
  };
}

it("从隐式牌堆归还全部原牌，保留档案与朝向；不推进RNG或改变输入", () => {
  const input = fixture(),
    before = structuredClone(input);
  const result = returnPoolRebirthCards(input.fallen, input.heroes, input.pools);
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") return;
  expect(input).toEqual(before);
  expect(result.heroes.at(-1)).toEqual(input.fallen.hero);
  expect(result.pools.trinkets!.held).toEqual(input.fallen.trinkets);
  expect(conditionPoolProblem(result.pools.conditions!, result.heroes)).toBeNull();
  expect(trinketPoolProblem(result.pools.trinkets!, result.heroes)).toBeNull();
  expect(result.pools.conditions!.diseaseDeck).toBeNull();
  expect(returnPoolRebirthCards(input.fallen, input.heroes, input.pools)).toEqual(result);
});

it("其他持有者只交还指定实体牌，保留无关牌与英雄数据", () => {
  const input = fixture(),
    dead = input.fallen.hero;
  const extraQuirk = input.pools.conditions.quirks.find((q) => !dead.quirkIds!.includes(q.id))!.id;
  const heroes = input.heroes.map((h, i) =>
    i
      ? h
      : {
          ...h,
          xp: 13,
          stress: 6,
          diseaseId: dead.diseaseId!,
          quirkIds: [...dead.quirkIds!, extraQuirk],
          resolveCardId: dead.resolveCardId,
          resolveTested: true,
        },
  );
  const pools = {
    ...input.pools,
    trinkets: {
      ...input.pools.trinkets,
      held: [{ ...input.fallen.trinkets[0]!, heroId: heroes[0]!.id, face: "upright" as const }],
    },
  };
  const before = structuredClone({ heroes, pools });
  const result = returnPoolRebirthCards(input.fallen, heroes, pools);
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") return;
  expect(result.heroes[0]).toMatchObject({
    xp: 13,
    stress: 6,
    diseaseId: null,
    quirkIds: [extraQuirk],
  });
  expect(result.heroes[0]!.resolveCardId).toBeUndefined();
  expect(result.pools.trinkets!.held).toEqual(input.fallen.trinkets);
  expect({ heroes, pools }).toEqual(before);
});

it("从显式牌堆和弃牌取回后保持其余牌序；支持跨等级饰品池", () => {
  const input = fixture(),
    target = input.fallen.hero;
  const switched = switchTrinketDungeonLevel(
    input.pools.trinkets,
    normalizedTrinketFileSchema.parse(rawTrinkets).cards,
    2,
  );
  expect("reason" in switched).toBe(false);
  if ("reason" in switched) return;
  const c = input.pools.conditions;
  const pools = {
    ...input.pools,
    conditions: {
      ...c,
      diseaseDiscard: [target.diseaseId!],
      diseaseDeck: c.diseases.filter((d) => d.id !== target.diseaseId).map((d) => d.id),
      negativeDeck: c.quirks.filter((q) => q.polarity === "negative").map((q) => q.id),
    },
    trinkets: {
      ...switched,
      inactive: switched.inactive!.map((p) => ({
        ...p,
        deck: input.pools.trinkets.cards
          .filter((c) => c.id !== input.fallen.trinkets[0]!.cardId)
          .map((c) => c.id),
        discard: [input.fallen.trinkets[0]!.cardId],
      })),
    },
    resolveDecks: Object.fromEntries(
      (["virtue", "affliction"] as const).map((role) => [
        role,
        input.pools.resolveCards.filter((c) => c.role === role).map((c) => c.id),
      ]),
    ),
  };
  const result = returnPoolRebirthCards(input.fallen, input.heroes, pools);
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") return;
  expect(result.pools.conditions!.diseaseDiscard).toEqual([]);
  expect(result.pools.conditions!.diseaseDeck).toEqual(pools.conditions.diseaseDeck);
  expect(result.pools.conditions!.negativeDeck).toEqual(
    pools.conditions.negativeDeck.filter((id) => !target.quirkIds!.includes(id)),
  );
  expect(result.pools.trinkets!.inactive![0]!.discard).toEqual([]);
  expect(trinketPoolProblem(result.pools.trinkets!, result.heroes)).toBeNull();
});

it("拒绝重复实体、坏池、缺目录、重复复活与待选入牌，不返回部分结果", () => {
  const input = fixture();
  const cases = [
    {
      ...input,
      fallen: { ...input.fallen, trinkets: [...input.fallen.trinkets, ...input.fallen.trinkets] },
    },
    { ...input, heroes: [...input.heroes, { ...input.fallen.hero, dead: false }] },
    {
      ...input,
      pools: {
        trinkets: input.pools.trinkets,
        resolveCards: input.pools.resolveCards,
        resolveDecks: input.pools.resolveDecks,
      },
    },
    { ...input, pools: { ...input.pools, trinkets: { ...input.pools.trinkets, deck: [] } } },
    { ...input, pools: { ...input.pools, resolveDecks: { virtue: [] } } },
    {
      ...input,
      pools: {
        ...input.pools,
        trinkets: {
          ...input.pools.trinkets,
          incoming: { actorId: input.heroes[0]!.id, cardId: input.fallen.trinkets[0]!.cardId },
        },
      },
    },
    { ...input, fallen: { ...input.fallen, hero: { ...input.fallen.hero, diseaseId: "unknown" } } },
  ];
  for (const c of cases) {
    const before = structuredClone(c);
    expect(returnPoolRebirthCards(c.fallen, c.heroes, c.pools)).toMatchObject({
      status: "refused",
    });
    expect(c).toEqual(before);
  }
});

it.each(["deck", "discard", "display"] as const)(
  "从当前等级饰品%s取回时不重洗其余牌",
  (location) => {
    const input = fixture();
    const pool = input.pools.trinkets;
    const id = input.fallen.trinkets[0]!.cardId;
    const rest = pool.cards.filter((c) => c.id !== id).map((c) => c.id);
    const trinkets = {
      ...pool,
      deck: location === "deck" ? [rest[0]!, id, ...rest.slice(1)] : rest,
      discard: location === "discard" ? [id] : [],
      display: location === "display" ? [id] : [],
    };
    const result = returnPoolRebirthCards(input.fallen, input.heroes, { ...input.pools, trinkets });
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.pools.trinkets!.deck).toEqual(rest);
    expect(result.pools.trinkets!.discard).toEqual([]);
    expect(result.pools.trinkets!.display).toEqual([]);
    expect(returnPoolRebirthCards(input.fallen, result.heroes, result.pools).status).toBe(
      "refused",
    );
  },
);
