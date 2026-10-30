import { availableTrinket, spendTrinket, trinketChoice } from "./trinket-reactions";
import type { TrinketScope } from "./trinket-reactions";
import { diseaseCardSchema } from "../../data/src/disease";
import type { DiseaseCard } from "../../data/src/disease";
import { normalizedQuirkCardSchema } from "../../data/src/normalize/schema";
import type { NormalizedQuirkCard } from "../../data/src/normalize/schema";
import { createRng } from "./rng";
import { QUIRK_NAMES } from "./passive";
import type { PassiveHolder } from "./passive";

export type ConditionPool = {
  readonly diseases: readonly DiseaseCard[];
  readonly quirks: readonly NormalizedQuirkCard[];
  readonly diseaseDeck: readonly string[] | null;
  readonly diseaseDiscard: readonly string[];
  readonly negativeDeck: readonly string[] | null;
  readonly positiveDeck?: readonly string[] | null;
  readonly quirkDiscard: readonly string[];
  readonly incomingQuirk?: { readonly heroId: string; readonly cardId: string };
};
export type ConditionHero = PassiveHolder & { readonly id: string; readonly dead?: boolean };
const isArray = (value: unknown): boolean => Array.isArray(value);
export function createConditionPool(
  diseases: readonly DiseaseCard[],
  quirks: readonly NormalizedQuirkCard[],
): ConditionPool {
  const pool: ConditionPool = {
    diseases,
    quirks,
    diseaseDeck: null,
    diseaseDiscard: [],
    negativeDeck: null,
    positiveDeck: null,
    quirkDiscard: [],
  };
  const problem = conditionPoolProblem(pool, []);
  if (problem) throw new Error(problem);
  return pool;
}
/** 全量实体牌守恒。未命名图标保留；具名官方规则独立于卡面验证。 */
export function conditionPoolProblem(
  pool: ConditionPool,
  heroes: readonly ConditionHero[],
): string | null {
  if (
    !pool ||
    !isArray(pool.diseases) ||
    !isArray(pool.quirks) ||
    !isArray(pool.diseaseDiscard) ||
    !isArray(pool.quirkDiscard) ||
    (pool.diseaseDeck !== null && !isArray(pool.diseaseDeck)) ||
    (pool.negativeDeck !== null && !isArray(pool.negativeDeck)) ||
    (pool.positiveDeck != null && !isArray(pool.positiveDeck)) ||
    !isArray(heroes)
  )
    return "疾病 / 怪癖池或英雄数组无效";
  if (
    Array.from(heroes).some(
      (h) =>
        !h ||
        typeof h.id !== "string" ||
        !h.id ||
        (h.dead !== undefined && typeof h.dead !== "boolean") ||
        (h.diseaseId !== undefined &&
          h.diseaseId !== null &&
          (typeof h.diseaseId !== "string" || !h.diseaseId)) ||
        (h.quirkIds !== undefined && !isArray(h.quirkIds)),
    ) ||
    new Set(heroes.map((h) => h.id)).size !== heroes.length
  )
    return "英雄持牌身份、死亡状态或怪癖数组无效 / 重复";
  if (
    pool.diseases.length !== 11 ||
    pool.quirks.length !== 35 ||
    Array.from(pool.diseases).some((c) => !diseaseCardSchema.safeParse(c).success) ||
    Array.from(pool.quirks).some(
      (c) =>
        !normalizedQuirkCardSchema.safeParse(c).success ||
        c.copies !== 1 ||
        c.pages.length !== 1 ||
        c.id !== `quirk:p${String(c.pages[0]).padStart(3, "0")}` ||
        c.name !== QUIRK_NAMES[c.pages[0]! - 1] ||
        c.polarity !== (c.pages[0]! <= 17 ? "positive" : "negative") ||
        c.polarity_source !== "rulebook_r26_r27",
    ) ||
    new Set(pool.diseases.map((c) => c.id)).size !== 11 ||
    new Set(pool.quirks.map((c) => c.id)).size !== 35
  )
    return "疾病 / 怪癖需要完整官方目录，身份、页码或数值无效（R26–28、R-048）";
  if (
    heroes.some(
      (h) =>
        (h.quirkIds?.length ?? 0) > 3 ||
        h.quirkIds?.some((id) => !pool.quirks.some((c) => c.id === id)),
    )
  )
    return "英雄怪癖未知或超过三张（R26）";
  const heldDiseases = heroes.flatMap((h) => (h.diseaseId ? [h.diseaseId] : []));
  const heldQuirks = heroes.flatMap((h) => h.quirkIds ?? []);
  const negativeIds = pool.quirks.filter((c) => c.polarity === "negative").map((c) => c.id);
  const positiveIds = pool.quirks.filter((c) => c.polarity === "positive").map((c) => c.id);
  const partitions = [
    {
      all: pool.diseases.map((c) => c.id),
      parts: [
        ...(pool.diseaseDeck ??
          pool.diseases
            .map((c) => c.id)
            .filter((id) => !heldDiseases.includes(id) && !pool.diseaseDiscard.includes(id))),
        ...pool.diseaseDiscard,
        ...heldDiseases,
      ],
    },
    {
      all: negativeIds,
      parts: [
        ...(pool.negativeDeck ??
          negativeIds.filter((id) => !heldQuirks.includes(id) && !pool.quirkDiscard.includes(id))),
        ...pool.quirkDiscard.filter((id) => negativeIds.includes(id)),
        ...heldQuirks.filter((id) => negativeIds.includes(id)),
        ...(pool.incomingQuirk && negativeIds.includes(pool.incomingQuirk.cardId)
          ? [pool.incomingQuirk.cardId]
          : []),
      ],
    },
    {
      all: positiveIds,
      parts: [
        ...(pool.positiveDeck ??
          positiveIds.filter((id) => !heldQuirks.includes(id) && !pool.quirkDiscard.includes(id))),
        ...pool.quirkDiscard.filter((id) => positiveIds.includes(id)),
        ...heldQuirks.filter((id) => positiveIds.includes(id)),
        ...(pool.incomingQuirk && positiveIds.includes(pool.incomingQuirk.cardId)
          ? [pool.incomingQuirk.cardId]
          : []),
      ],
    },
  ];
  if (
    new Set(heldQuirks).size !== heldQuirks.length ||
    Array.from(pool.quirkDiscard).some(
      (id) => !pool.quirks.some((c) => c.id === id) || heldQuirks.includes(id),
    ) ||
    new Set(pool.quirkDiscard).size !== pool.quirkDiscard.length ||
    partitions.some(
      ({ all, parts }) =>
        parts.length !== all.length ||
        new Set(parts).size !== all.length ||
        parts.some((id) => !all.includes(id)),
    )
  )
    return "疾病 / 怪癖牌堆、弃牌与英雄持牌不守恒";
  if (
    pool.incomingQuirk &&
    (!pool.quirks.some((c) => c.id === pool.incomingQuirk!.cardId) ||
      !heroes.some(
        (h) =>
          h.id === pool.incomingQuirk!.heroId &&
          !h.dead &&
          h.quirkIds?.length === 3 &&
          h.quirkIds.some((id) =>
            pool.quirks.some((c) => c.id === id && c.polarity === "positive"),
          ),
      ))
  )
    return "怪癖替换选择无效";
  return null;
}
export function gainDisease<T extends ConditionHero>(
  pool: ConditionPool,
  heroes: readonly T[],
  heroId: string,
  seed: number,
  cursor: number,
  scope?: TrinketScope,
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly pool: ConditionPool;
      readonly heroes: readonly T[];
      readonly cursor: number;
      readonly diseaseId: string;
      readonly quirkId?: string;
      readonly replaceOptions?: readonly string[];
    } {
  const problem = conditionPoolProblem(pool, heroes);
  if (problem) return { status: "refused", reason: problem };
  const hero = heroes.find((h) => h.id === heroId);
  if (
    !hero ||
    hero.dead ||
    pool.incomingQuirk ||
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0
  )
    return { status: "refused", reason: "感染需要存活英雄、有效 RNG 且没有待选怪癖" };
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  const draw = (deck: readonly string[] | null, ids: string[]) => {
    const cards = [...(deck ?? ids)];
    if (deck === null)
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [cards[i], cards[j]] = [cards[j]!, cards[i]!];
        nextCursor++;
      }
    return cards;
  };
  const diseaseDeck = draw(
    pool.diseaseDeck,
    pool.diseases
      .map((c) => c.id)
      .filter((id) => !heroes.some((h) => h.diseaseId === id) && !pool.diseaseDiscard.includes(id)),
  );
  const diseaseId = diseaseDeck.shift();
  if (!diseaseId) return { status: "refused", reason: "疾病堆耗尽，未擅自洗回弃牌（R32）" };
  let nextPool: ConditionPool = {
    ...pool,
    diseaseDeck,
    diseaseDiscard: [...pool.diseaseDiscard, ...(hero.diseaseId ? [hero.diseaseId] : [])],
  };
  let quirkId: string | undefined;
  let replaceOptions: readonly string[] | undefined;
  let nextHeroes = heroes.map((h) => (h.id === heroId ? { ...h, diseaseId } : h));
  if (hero.diseaseId) {
    const acquired = gainNegativeQuirk(nextPool, nextHeroes, heroId, seed, nextCursor);
    if (acquired.status === "refused") return acquired;
    quirkId = acquired.quirkId;
    replaceOptions = acquired.replaceOptions;
    nextPool = acquired.pool;
    nextHeroes = [...acquired.heroes];
    nextCursor = acquired.cursor;
  }

  if (
    scope &&
    availableTrinket(scope, heroId, "trinket:p016", "upright") &&
    !nextHeroes.find((h) => h.id === heroId)!.dead
  ) {
    if (replaceOptions) {
      const selected = trinketChoice(
        scope,
        heroId,
        "disease-quirk",
        "先按R27替换正面怪癖，再选择是否弃掉新疾病",
        replaceOptions.map((id) => ({ id, label: id })),
        true,
      );
      const replaced = replaceConditionQuirk(nextPool, nextHeroes, selected);
      if (replaced.status === "refused") return replaced;
      nextPool = replaced.pool;
      nextHeroes = [...replaced.heroes];
      replaceOptions = undefined;
    }
    const selected = trinketChoice(
      scope,
      heroId,
      "disease",
      "已获得疾病 " + diseaseId + "：Book of Constitution 可立即弃掉新疾病（R-130）",
      [{ id: "trinket:p016", label: "弃掉新疾病并翻面；不撤销R27的替换和负面怪癖" }],
    );
    if (selected === "trinket:p016") {
      nextPool = { ...nextPool, diseaseDiscard: [...nextPool.diseaseDiscard, diseaseId] };
      nextHeroes = nextHeroes.map((h) => (h.id === heroId ? { ...h, diseaseId: null } : h));
      spendTrinket(scope, heroId, "trinket:p016");
    }
  }
  return {
    status: "resolved",
    pool: nextPool,
    heroes: nextHeroes,
    cursor: nextCursor,
    diseaseId,
    ...(quirkId ? { quirkId } : {}),
    ...(replaceOptions ? { replaceOptions } : {}),
  };
}

/** R26：负面堆完整抽取；第四张只替换正面，三负面时发疯永久死亡。 */
export function gainNegativeQuirk<T extends ConditionHero>(
  pool: ConditionPool,
  heroes: readonly T[],
  heroId: string,
  seed: number,
  cursor: number,
):
  | { status: "refused"; reason: string }
  | {
      status: "resolved";
      pool: ConditionPool;
      heroes: readonly T[];
      cursor: number;
      quirkId: string;
      replaceOptions?: readonly string[];
    } {
  if (pool && pool.negativeDeck !== null && !Array.isArray(pool.negativeDeck))
    return { status: "refused", reason: "负面牌堆必须明确未洗牌或完整牌列" };
  const problem = conditionPoolProblem(pool, heroes);
  const hero = heroes.find((h) => h.id === heroId);
  if (
    problem ||
    !hero ||
    hero.dead ||
    pool.incomingQuirk ||
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0
  )
    return { status: "refused", reason: problem ?? "负面怪癖需要存活英雄、有效RNG且没有待选怪癖" };
  const deck = [
    ...(pool.negativeDeck ??
      pool.quirks
        .filter(
          (c) =>
            c.polarity === "negative" &&
            !heroes.some((h) => h.quirkIds?.includes(c.id)) &&
            !pool.quirkDiscard.includes(c.id),
        )
        .map((c) => c.id)),
  ];
  if (!deck.length) return { status: "refused", reason: "负面怪癖堆耗尽，未洗回弃牌（R32）" };
  const shuffleSteps = pool.negativeDeck === null ? deck.length - 1 : 0;
  if (!Number.isSafeInteger(cursor + shuffleSteps))
    return { status: "refused", reason: "负面怪癖洗牌游标超出安全范围" };
  let nextCursor = cursor;
  if (shuffleSteps > 0) {
    const rng = createRng(seed);
    for (let i = 0; i < cursor; i++) rng.next();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      nextCursor++;
    }
  }
  const quirkId = deck.shift()!;
  let nextPool: ConditionPool = { ...pool, negativeDeck: deck };
  const held = hero.quirkIds ?? [];
  let updated = hero;
  let replaceOptions: readonly string[] | undefined;
  if (held.length < 3) updated = { ...hero, quirkIds: [...held, quirkId] };
  else {
    const positive = held.filter((id) =>
      pool.quirks.some((c) => c.id === id && c.polarity === "positive"),
    );
    if (positive.length) {
      nextPool = { ...nextPool, incomingQuirk: { heroId, cardId: quirkId } };
      replaceOptions = positive;
    } else {
      updated = { ...hero, dead: true, deathReason: "madness" };
      nextPool = { ...nextPool, quirkDiscard: [...pool.quirkDiscard, quirkId] };
    }
  }
  return {
    status: "resolved",
    pool: nextPool,
    heroes: heroes.map((h) => (h.id === heroId ? updated : h)),
    cursor: nextCursor,
    quirkId,
    ...(replaceOptions ? { replaceOptions } : {}),
  };
}
export function replaceConditionQuirk<T extends ConditionHero>(
  pool: ConditionPool,
  heroes: readonly T[],
  cardId: string,
):
  | { readonly status: "refused"; readonly reason: string }
  | { readonly status: "resolved"; readonly pool: ConditionPool; readonly heroes: readonly T[] } {
  const problem = conditionPoolProblem(pool, heroes);
  const incoming = pool.incomingQuirk;
  const hero = heroes.find((h) => h.id === incoming?.heroId);
  const discardNew =
    incoming?.cardId === cardId &&
    pool.quirks.some((c) => c.id === cardId && c.polarity === "positive");
  if (
    problem ||
    !incoming ||
    !hero ||
    (!discardNew &&
      (!hero.quirkIds?.includes(cardId) ||
        !pool.quirks.some((c) => c.id === cardId && c.polarity === "positive")))
  )
    return { status: "refused", reason: problem ?? "必须选择该英雄已有的正面怪癖（R26）" };
  const { incomingQuirk: _incoming, ...remaining } = pool;
  void _incoming;
  return {
    status: "resolved",
    pool: { ...remaining, quirkDiscard: [...remaining.quirkDiscard, cardId] },
    heroes: heroes.map((h) =>
      h.id === hero.id && !discardNew
        ? { ...h, quirkIds: h.quirkIds!.map((id) => (id === cardId ? incoming.cardId : id)) }
        : h,
    ),
  };
}

/** R26：正面堆完整抽取；第四张仅替换正面或弃新卡，三负面时自动弃新卡。 */
export function gainPositiveQuirk<T extends ConditionHero>(
  pool: ConditionPool,
  heroes: readonly T[],
  heroId: string,
  seed: number,
  cursor: number,
):
  | { status: "refused"; reason: string }
  | {
      status: "resolved";
      pool: ConditionPool;
      heroes: readonly T[];
      cursor: number;
      quirkId: string;
      replaceOptions?: readonly string[];
    } {
  const problem = conditionPoolProblem(pool, heroes);
  const hero = heroes.find((h) => h.id === heroId);
  if (
    problem ||
    !hero ||
    hero.dead ||
    pool.incomingQuirk ||
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0
  )
    return {
      status: "refused",
      reason: problem ?? "正面怪癖需要存活英雄、有效 RNG 且没有待选怪癖",
    };
  const deck = [
    ...(pool.positiveDeck ??
      pool.quirks
        .filter(
          (c) =>
            c.polarity === "positive" &&
            !heroes.some((h) => h.quirkIds?.includes(c.id)) &&
            !pool.quirkDiscard.includes(c.id),
        )
        .map((c) => c.id)),
  ];
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  if (pool.positiveDeck == null)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      nextCursor++;
    }
  const quirkId = deck.shift();
  if (!quirkId) return { status: "refused", reason: "正面怪癖堆耗尽，未洗回弃牌（R32）" };
  let nextPool: ConditionPool = { ...pool, positiveDeck: deck };
  const held = hero.quirkIds ?? [];
  let updated = hero;
  let replaceOptions: readonly string[] | undefined;
  if (held.length < 3) updated = { ...hero, quirkIds: [...held, quirkId] };
  else {
    const positive = held.filter((id) =>
      pool.quirks.some((c) => c.id === id && c.polarity === "positive"),
    );
    if (positive.length) {
      nextPool = { ...nextPool, incomingQuirk: { heroId, cardId: quirkId } };
      replaceOptions = [...positive, quirkId];
    } else nextPool = { ...nextPool, quirkDiscard: [...pool.quirkDiscard, quirkId] };
  }
  return {
    status: "resolved",
    pool: nextPool,
    heroes: heroes.map((h) => (h.id === heroId ? updated : h)),
    cursor: nextCursor,
    quirkId,
    ...(replaceOptions ? { replaceOptions } : {}),
  };
}
