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

/** 只校验身份 / 持牌与容量；不解释卡面未知图标或执行饰品能力。 */
export function trinketPoolProblem(pool: TrinketPool, heroes: readonly Hero[]): string | null {
  if (
    !pool ||
    ![1, 2, 3].includes(pool.level) ||
    !Array.isArray(pool.cards) ||
    !Array.isArray(pool.discard) ||
    !Array.isArray(pool.held) ||
    (pool.deck !== null && !Array.isArray(pool.deck))
  )
    return "饰品池结构无效";
  const canonical = idsFor(pool.level);
  if (
    pool.cards.length !== canonical.length ||
    pool.cards.some((c) => !normalizedTrinketCardSchema.safeParse(c).success) ||
    new Set(pool.cards.map((c) => c.id)).size !== canonical.length ||
    pool.cards.some(
      (c) =>
        !normalizedTrinketCardSchema.safeParse(c).success ||
        !canonical.includes(c.id) ||
        c.level !== pool.level ||
        c.back_level !== pool.level ||
        c.copies !== 1 ||
        c.pages.length !== 1 ||
        c.id !== `trinket:p${String(c.pages[0]).padStart(3, "0")}`,
    )
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
    (pool.incoming && !heroes.some((h) => h.id === pool.incoming!.actorId && !h.dead))
  )
    return "饰品持有者、英雄等级、装备复核或容量无效（R26、R-048）";
  const held = pool.held.map((h) => h.cardId);
  const parts = [
    ...(pool.deck ?? canonical.filter((id) => !held.includes(id) && !pool.discard.includes(id))),
    ...pool.discard,
    ...held,
    ...(pool.incoming ? [pool.incoming.cardId] : []),
  ];
  if (
    parts.length !== canonical.length ||
    new Set(parts).size !== canonical.length ||
    parts.some((id) => !canonical.includes(id))
  )
    return "饰品牌堆、弃牌、持牌与待选入牌不守恒";
  return null;
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
        .map((c) => c.id)
        .filter((id) => !pool.discard.includes(id) && !pool.held.some((h) => h.cardId === id))),
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
      ? { ...pool, incoming: null, discard: [...pool.discard, incoming] }
      : a.type === "equip"
        ? {
            ...pool,
            incoming: null,
            held: [...pool.held, { cardId: incoming, heroId: a.heroId, face: "upright" }],
          }
        : a.type === "discardHeld"
          ? {
              ...pool,
              held: pool.held.filter((h) => h.cardId !== a.cardId),
              discard: [...pool.discard, a.cardId],
            }
          : {
              ...pool,
              held: pool.held.map((h) => (h.cardId === a.cardId ? { ...h, heroId: a.heroId } : h)),
            };
  return { status: "resolved" as const, pool: next };
}
