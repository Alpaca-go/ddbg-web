import { normalizedTrinketCardSchema } from "../../data/src/normalize/schema";
import type { NormalizedTrinketCard } from "../../data/src/normalize/schema";
import { createRng } from "./rng";

type Hero = { readonly id: string; readonly level?: number; readonly dead?: boolean };
export type TrinketPool = {
  readonly level: 1 | 2 | 3;
  readonly cards: readonly NormalizedTrinketCard[];
  readonly deck: readonly string[] | null;
  readonly discard: readonly string[];
  readonly held: readonly {
    readonly cardId: string;
    readonly heroId: string;
    readonly face: "upright" | "inverted";
  }[];
  readonly incoming: { readonly cardId: string; readonly actorId: string } | null;
  /** R33：村庄陈列品不属于牌堆/弃牌/持牌；首次来访后即使买空也不补货。 */
  readonly display?: readonly string[];
  /** R26/R32/R35：非地牢当前等级独立保存；也可由高等级游商提前启用。 */
  readonly inactive?: readonly {
    readonly level: 1 | 2 | 3;
    readonly deck: readonly string[] | null;
    readonly discard: readonly string[];
  }[];
};
type Action =
  | { type: "discardNew" }
  | { type: "equip"; heroId: string }
  | { type: "discardHeld"; cardId: string }
  | { type: "transfer"; cardId: string; heroId: string };
const idsFor = (level: number) =>
  Array.from(
    { length: level === 1 ? 14 : 12 },
    (_, i) => `trinket:p${String(i + (level === 1 ? 1 : level === 2 ? 15 : 27)).padStart(3, "0")}`,
  );

export function createTrinketPool(
  cards: readonly NormalizedTrinketCard[],
  level: 1 | 2 | 3,
): TrinketPool {
  if (
    cards.length !== 38 ||
    cards.some((c) => !normalizedTrinketCardSchema.safeParse(c).success) ||
    [1, 2, 3].some((l) => idsFor(l).some((id) => !cards.some((c) => c.id === id)))
  )
    throw new Error("需要完整核心盒 38 张饰品，不能只留已核实子集（R-048）");
  const pool: TrinketPool = {
    level,
    cards: cards.filter((c) => c.level === level),
    deck: null,
    discard: [],
    held: [],
    incoming: null,
  };
  const problem = trinketPoolProblem(pool, []);
  if (problem) throw new Error(problem);
  return pool;
}

function trinketCardOk(card: NormalizedTrinketCard, expectedLevel?: number) {
  return (
    normalizedTrinketCardSchema.safeParse(card).success &&
    (expectedLevel === undefined || card.level === expectedLevel) &&
    card.back_level === card.level &&
    card.copies === 1 &&
    idsFor(card.level).includes(card.id) &&
    card.pages.length === 1 &&
    card.id === `trinket:p${String(card.pages[0]).padStart(3, "0")}`
  );
}

/** 只校验身份 / 持牌与容量；不解释卡面未知图标或执行饰品能力。 */
export function trinketPoolProblem(pool: TrinketPool, heroes: readonly Hero[]): string | null {
  if (
    !pool ||
    ![1, 2, 3].includes(pool.level) ||
    !Array.isArray(pool.cards) ||
    !Array.isArray(pool.discard) ||
    !Array.isArray(pool.held) ||
    (pool.deck !== null && !Array.isArray(pool.deck)) ||
    (pool.inactive !== undefined &&
      (!Array.isArray(pool.inactive) ||
        pool.inactive.some(
          (p) =>
            !p ||
            ![1, 2, 3].includes(p.level) ||
            p.level === pool.level ||
            (p.deck !== null && !Array.isArray(p.deck)) ||
            !Array.isArray(p.discard),
        ) ||
        new Set(pool.inactive.map((p) => p.level)).size !== pool.inactive.length)) ||
    (pool.display !== undefined && (!Array.isArray(pool.display) || pool.display.length > 3))
  )
    return "饰品池结构无效";
  const canonical = idsFor(pool.level);
  const inactive = pool.inactive ?? [];
  const archivedIds = inactive.flatMap((p) => idsFor(p.level));
  const foreignHeldIds = [
    ...new Set(
      pool.held
        .map((h) => h.cardId)
        .filter((id) => !canonical.includes(id) && !archivedIds.includes(id)),
    ),
  ];
  const foreignIds = [...archivedIds, ...foreignHeldIds];
  const dungeonCards = pool.cards.filter((c) => c.level === pool.level);
  const foreignCards = pool.cards.filter((c) => c.level !== pool.level);
  if (
    dungeonCards.length !== canonical.length ||
    new Set(dungeonCards.map((c) => c.id)).size !== canonical.length ||
    canonical.some(
      (id) => !dungeonCards.some((c) => c.id === id && trinketCardOk(c, pool.level)),
    ) ||
    foreignCards.length !== foreignIds.length ||
    new Set(foreignCards.map((c) => c.id)).size !== foreignIds.length ||
    foreignIds.some((id) => !foreignCards.some((c) => c.id === id && trinketCardOk(c)))
  )
    return "饰品需要完整等级牌堆及获批身份，不能修改概率（R-048）";
  if (
    heroes.some((h) => !h || !h.id || !Number.isInteger(h.level) || h.level! < 1 || h.level! > 3) ||
    new Set(heroes.map((h) => h.id)).size !== heroes.length ||
    pool.held.some(
      (c) =>
        !c ||
        !heroes.some((h) => h.id === c.heroId) ||
        !["upright", "inverted"].includes(c.face) ||
        !pool.cards.some((card) => card.id === c.cardId && !card.verification.unverified),
    ) ||
    heroes.some((h) => pool.held.filter((c) => c.heroId === h.id).length > h.level!) ||
    (pool.incoming &&
      (!heroes.some((h) => h.id === pool.incoming!.actorId && !h.dead) ||
        ![...canonical, ...archivedIds].includes(pool.incoming.cardId)))
  )
    return "饰品持有者、英雄等级、装备复核或容量无效（R26、R-048）";
  const dungeonHeld = pool.held.map((h) => h.cardId).filter((id) => canonical.includes(id));
  const parts = [
    ...(pool.deck ??
      canonical.filter(
        (id) =>
          !dungeonHeld.includes(id) && !pool.discard.includes(id) && !pool.display?.includes(id),
      )),
    ...(pool.display ?? []).filter((id) => canonical.includes(id)),
    ...pool.discard,
    ...dungeonHeld,
    ...(pool.incoming && canonical.includes(pool.incoming.cardId) ? [pool.incoming.cardId] : []),
  ];
  if (
    parts.length !== canonical.length ||
    new Set(parts).size !== canonical.length ||
    parts.some((id) => !canonical.includes(id)) ||
    pool.discard.some((id) => !canonical.includes(id)) ||
    (pool.display ?? []).some((id) => ![...canonical, ...archivedIds].includes(id)) ||
    new Set(pool.display ?? []).size !== (pool.display ?? []).length
  )
    return "饰品牌堆、弃牌、持牌与待选入牌不守恒";
  if (new Set(pool.held.map((h) => h.cardId)).size !== pool.held.length) return "饰品持牌重复";
  for (const previous of inactive) {
    const ids = idsFor(previous.level);
    const held = pool.held.map((h) => h.cardId).filter((id) => ids.includes(id));
    const parts = [
      ...(previous.deck ??
        ids.filter(
          (id) =>
            !held.includes(id) && !previous.discard.includes(id) && !pool.display?.includes(id),
        )),
      ...previous.discard,
      ...held,
      ...(pool.display ?? []).filter((id) => ids.includes(id)),
      ...(pool.incoming && ids.includes(pool.incoming.cardId) ? [pool.incoming.cardId] : []),
    ];
    if (
      parts.length !== ids.length ||
      new Set(parts).size !== ids.length ||
      parts.some((id) => !ids.includes(id))
    )
      return "旧等级饰品牌堆、弃牌与持牌不守恒";
  }
  return null;
}

/** R35 / R-037：地牢饰品改为新等级；已装备的上一级饰品保留在英雄身上，不进新牌堆。 */
export function switchTrinketDungeonLevel(
  pool: TrinketPool,
  catalog: readonly NormalizedTrinketCard[],
  level: 1 | 2 | 3,
): TrinketPool | { readonly reason: string } {
  if (pool.level === level) return pool;
  if (level !== pool.level + 1) return { reason: "饰品牌堆仅按相邻等级向上切换（R35）" };
  if (pool.incoming || pool.display?.length)
    return { reason: "须先清空游商陈列与待选饰品，才能切换地牢饰品等级（R35）" };
  const next = createTrinketPool(catalog, level);
  const reserved = pool.inactive?.find((p) => p.level === level);
  const foreign = pool.held.filter((h) => !idsFor(level).includes(h.cardId));
  const foreignCards = foreign.map(
    (h) => pool.cards.find((c) => c.id === h.cardId) ?? catalog.find((c) => c.id === h.cardId),
  );
  if (foreignCards.some((c) => !c || !trinketCardOk(c) || c.verification.unverified))
    return { reason: "已装备的上一级饰品缺失或未核实，不能切换地牢饰品等级（R-048）" };
  return {
    ...next,
    cards: [...next.cards, ...pool.cards.filter((c) => c.level !== level)],
    inactive: [
      ...(pool.inactive ?? []).filter((p) => p.level !== level),
      { level: pool.level, deck: pool.deck, discard: pool.discard },
    ],
    held: [...pool.held],
    deck: reserved?.deck ?? null,
    discard: reserved?.discard ?? [],
    incoming: null,
  };
}

export function drawTrinket(
  pool: TrinketPool,
  heroes: readonly Hero[],
  actorId: string,
  seed: number,
  cursor: number,
) {
  const problem = trinketPoolProblem(pool, heroes);
  if (
    problem ||
    pool.incoming ||
    !heroes.some((h) => h.id === actorId && !h.dead) ||
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0
  )
    return {
      status: "refused" as const,
      reason: problem ?? "饰品抽取需要有效英雄、RNG 且没有待选入牌",
    };
  const deck = [
    ...(pool.deck ??
      pool.cards
        .filter((c) => c.level === pool.level)
        .map((c) => c.id)
        .filter(
          (id) =>
            !pool.discard.includes(id) &&
            !pool.held.some((h) => h.cardId === id) &&
            !pool.display?.includes(id),
        )),
  ];
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  if (pool.deck === null)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      nextCursor++;
    }
  const cardId = deck.shift();
  if (!cardId) return { status: "refused" as const, reason: "饰品牌堆耗尽，未擅自洗回弃牌（R32）" };
  return {
    status: "resolved" as const,
    pool: { ...pool, deck, incoming: { cardId, actorId } },
    cursor: nextCursor,
  };
}

export function trinketOptions(pool: TrinketPool, heroes: readonly Hero[]) {
  const options: { id: string; label: string; action: Action }[] = [];
  if (!pool.incoming || trinketPoolProblem(pool, heroes)) return options;
  const card = pool.cards.find((c) => c.id === pool.incoming!.cardId)!;
  options.push({
    id: "discard-new",
    label: `弃掉新饰品：${card.name}`,
    action: { type: "discardNew" },
  });
  if (card.verification.unverified) return options; // 保留原概率和待选卡，不装备未知卡面。
  const living = heroes.filter((h) => !h.dead);
  const free = living.filter((h) => pool.held.filter((c) => c.heroId === h.id).length < h.level!);
  for (const hero of free)
    options.push({
      id: `equip:${hero.id}`,
      label: `${hero.id} 装备 ${card.name}`,
      action: { type: "equip", heroId: hero.id },
    });
  for (const held of pool.held.filter((c) => living.some((h) => h.id === c.heroId))) {
    const name = pool.cards.find((c) => c.id === held.cardId)!.name;
    if (
      idsFor(pool.level).includes(held.cardId) ||
      pool.inactive?.some((p) => idsFor(p.level).includes(held.cardId))
    )
      options.push({
        id: `discard:${held.cardId}`,
        label: `弃掉 ${held.heroId} 的 ${name}，腾出位置`,
        action: { type: "discardHeld", cardId: held.cardId },
      });
    for (const hero of free.filter((h) => h.id !== held.heroId))
      options.push({
        id: `transfer:${held.cardId}:${hero.id}`,
        label: `把 ${held.heroId} 的 ${name} 交给 ${hero.id}`,
        action: { type: "transfer", cardId: held.cardId, heroId: hero.id },
      });
  }
  return options;
}

export function chooseTrinket(pool: TrinketPool, heroes: readonly Hero[], optionId: string) {
  const option = trinketOptions(pool, heroes).find((o) => o.id === optionId);
  if (!option || !pool.incoming)
    return { status: "refused" as const, reason: "饰品选择无效、容量已满或卡面未核实" };
  const a = option.action,
    incoming = pool.incoming.cardId;
  const next: TrinketPool =
    a.type === "discardNew"
      ? { ...discardTrinket(pool, incoming), incoming: null }
      : a.type === "equip"
        ? {
            ...pool,
            incoming: null,
            held: [...pool.held, { cardId: incoming, heroId: a.heroId, face: "upright" }],
          }
        : a.type === "discardHeld"
          ? {
              ...pool,
              ...discardTrinket(pool, a.cardId),
              held: pool.held.filter((h) => h.cardId !== a.cardId),
            }
          : {
              ...pool,
              held: pool.held.map((h) => (h.cardId === a.cardId ? { ...h, heroId: a.heroId } : h)),
            };
  return { status: "resolved" as const, pool: next };
}

function discardTrinket(pool: TrinketPool, cardId: string): TrinketPool {
  return idsFor(pool.level).includes(cardId)
    ? { ...pool, discard: [...pool.discard, cardId] }
    : {
        ...pool,
        inactive: pool.inactive!.map((p) =>
          idsFor(p.level).includes(cardId) ? { ...p, discard: [...p.discard, cardId] } : p,
        ),
      };
}

/** R26/R31：只移除指定已持卡，按其原等级弃置；不洗牌或改变其他卡朝向。 */
export function discardHeldTrinket(pool: TrinketPool, cardId: string) {
  const card = pool.cards.find((c) => c.id === cardId);
  if (!card || !pool.held.some((h) => h.cardId === cardId) || !trinketDeck(pool, card.level))
    return { status: "refused" as const, reason: "持有饰品缺少原等级牌堆，未弃置（R26/R31）" };
  return {
    status: "resolved" as const,
    pool: {
      ...discardTrinket(pool, cardId),
      held: pool.held.filter((h) => h.cardId !== cardId),
    },
  };
}

/** 同一目录下的分级牌堆；隐式未洗牌堆只排除该级已占用的卡。 */
export function trinketDeck(pool: TrinketPool, level: number) {
  const partition = level === pool.level ? pool : pool.inactive?.find((p) => p.level === level);
  if (!partition) return null;
  return {
    ...partition,
    deck:
      partition.deck ??
      pool.cards
        .filter((c) => c.level === level)
        .map((c) => c.id)
        .filter(
          (id) =>
            !partition.discard.includes(id) &&
            !pool.held.some((h) => h.cardId === id) &&
            !pool.display?.includes(id) &&
            pool.incoming?.cardId !== id,
        ),
    unshuffled: partition.deck === null,
  };
}

export function setTrinketDeck(
  pool: TrinketPool,
  level: number,
  deck: readonly string[],
): TrinketPool {
  return level === pool.level
    ? { ...pool, deck }
    : { ...pool, inactive: pool.inactive!.map((p) => (p.level === level ? { ...p, deck } : p)) };
}
