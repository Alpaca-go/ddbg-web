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
        ...(pool.incomingQuirk ? [pool.incomingQuirk.cardId] : []),
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
    !heroes.some(
      (h) =>
        h.id === pool.incomingQuirk!.heroId &&
        !h.dead &&
        h.quirkIds?.length === 3 &&
        h.quirkIds.some((id) => pool.quirks.some((c) => c.id === id && c.polarity === "positive")),
    )
  )
    return "负面怪癖替换选择无效";
  return null;
}
export function gainDisease<T extends ConditionHero>(
  pool: ConditionPool,
  heroes: readonly T[],
  heroId: string,
  seed: number,
  cursor: number,
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
  let updated: T = { ...hero, diseaseId };
  if (hero.diseaseId) {
    const negativeDeck = draw(
      pool.negativeDeck,
      pool.quirks
        .filter(
          (c) =>
            c.polarity === "negative" &&
            !heroes.some((h) => h.quirkIds?.includes(c.id)) &&
            !pool.quirkDiscard.includes(c.id),
        )
        .map((c) => c.id),
    );
    quirkId = negativeDeck.shift();
    if (!quirkId)
      return { status: "refused", reason: "负面怪癖堆耗尽，未提交感染或洗回弃牌（R32）" };
    nextPool = { ...nextPool, negativeDeck };
    const held = hero.quirkIds ?? [];
    if (held.length < 3) updated = { ...updated, quirkIds: [...held, quirkId] };
    else {
      replaceOptions = held.filter((id) =>
        pool.quirks.some((c) => c.id === id && c.polarity === "positive"),
      );
      if (replaceOptions.length)
        nextPool = { ...nextPool, incomingQuirk: { heroId, cardId: quirkId } };
      else {
        updated = { ...updated, dead: true, deathReason: "madness" };
        nextPool = { ...nextPool, quirkDiscard: [...nextPool.quirkDiscard, quirkId] };
        replaceOptions = undefined;
      }
    }
  }
  return {
    status: "resolved",
    pool: nextPool,
    heroes: heroes.map((h) => (h.id === heroId ? updated : h)),
    cursor: nextCursor,
    diseaseId,
    ...(quirkId ? { quirkId } : {}),
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
  if (
    problem ||
    !incoming ||
    !hero?.quirkIds?.includes(cardId) ||
    !pool.quirks.some((c) => c.id === cardId && c.polarity === "positive")
  )
    return { status: "refused", reason: problem ?? "必须选择该英雄已有的正面怪癖（R26）" };
  const { incomingQuirk: _incoming, ...remaining } = pool;
  void _incoming;
  return {
    status: "resolved",
    pool: { ...remaining, quirkDiscard: [...remaining.quirkDiscard, cardId] },
    heroes: heroes.map((h) =>
      h.id === hero.id
        ? { ...h, quirkIds: h.quirkIds!.map((id) => (id === cardId ? incoming.cardId : id)) }
        : h,
    ),
  };
}
