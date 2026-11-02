import type { FallenHero } from "./fallen-heroes";
import type { DungeonState } from "./dungeon";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";

type Hero = DungeonState["heroes"][number];
type Pools = Pick<DungeonState, "conditions" | "trinkets" | "resolveCards" | "resolveDecks">;
type Result =
  | { readonly status: "refused"; readonly reason: string }
  | { readonly status: "resolved"; readonly heroes: readonly Hero[]; readonly pools: Pools };

function resolveProblem(pools: Pools, heroes: readonly Hero[]): string | null {
  const cards = pools.resolveCards;
  const held = heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (
    cards.length !== 10 ||
    new Set(cards.map((c) => c.id)).size !== 10 ||
    cards.some((c) => c.verification.unverified) ||
    new Set(held).size !== held.length ||
    held.some((id) => !cards.some((c) => c.id === id))
  )
    return "重生池需要完整且持牌唯一的意志牌池（R-048）";
  for (const role of ["affliction", "virtue"] as const) {
    const available = cards.filter((c) => c.role === role && !held.includes(c.id));
    const deck = pools.resolveDecks[role];
    if (
      cards.filter((c) => c.role === role).length !== 5 ||
      (deck &&
        (deck.length !== available.length ||
          new Set(deck).size !== deck.length ||
          deck.some((id) => !available.some((c) => c.id === id))))
    )
      return "重生池意志牌堆不守恒（R-148）";
  }
  return null;
}

/** R-148：只准备原实体牌归还，不复活、不支付压力、不写入驿站。
 * heroes必须包含全部当前持牌者；返回的死者仍保留原始死亡状态，供调用方原子续接。
 */
export function returnPoolRebirthCards(
  fallen: FallenHero,
  heroes: readonly Hero[],
  pools: Pools,
): Result {
  const refuse = (reason: string): Result => ({ status: "refused", reason });
  const target = fallen.hero;
  const existing = heroes.find((h) => h.id === target.id);
  if (
    !target.dead ||
    (existing &&
      (!existing.dead ||
        existing.diseaseId ||
        existing.quirkIds?.length ||
        existing.resolveCardId)) ||
    pools.trinkets?.held.some((h) => h.heroId === target.id) ||
    fallen.trinkets.some((h) => h.heroId !== target.id) ||
    pools.conditions?.incomingQuirk ||
    pools.trinkets?.incoming
  )
    return refuse("重生池归还需已回收死者、完整档案且无待选入牌（R-147/R-148）");
  if (!pools.conditions || !pools.trinkets)
    return refuse("重生池缺少完整疾病/怪癖/饰品池（R-048）");
  const problem =
    conditionPoolProblem(pools.conditions, heroes) ??
    trinketPoolProblem(pools.trinkets, heroes) ??
    resolveProblem(pools, heroes);
  if (problem) return refuse(problem);
  const trinketIds = fallen.trinkets.map((h) => h.cardId);
  if (
    new Set(trinketIds).size !== trinketIds.length ||
    trinketIds.some((id) => !pools.trinkets!.cards.some((c) => c.id === id))
  )
    return refuse("重生池原饰品缺少当前目录或档案重复（R-048/R-148）");

  const quirks = target.quirkIds ?? [];
  const strip = <
    T extends {
      readonly diseaseId?: string | null;
      readonly quirkIds?: readonly string[];
      readonly resolveCardId?: string | null | undefined;
    },
  >(
    hero: T,
  ): T => ({
    ...hero,
    ...(hero.diseaseId && hero.diseaseId === target.diseaseId ? { diseaseId: null } : {}),
    ...(hero.quirkIds ? { quirkIds: hero.quirkIds.filter((id) => !quirks.includes(id)) } : {}),
    ...(hero.resolveCardId && hero.resolveCardId === target.resolveCardId
      ? { resolveCardId: undefined, resolveTested: false }
      : {}),
  });
  const nextHeroes = [
    ...heroes
      .filter((h) => h.id !== target.id)
      .map((h) => {
        const next = strip(h);
        if (!h.combat) return next;
        const combat = strip(h.combat);
        return { ...next, combat: { ...combat, resolveCardId: combat.resolveCardId ?? null } };
      }),
    structuredClone(target),
  ];
  const withoutTrinkets = (ids: readonly string[]) => ids.filter((id) => !trinketIds.includes(id));
  const conditions = pools.conditions;
  const next: Pools = {
    conditions: {
      ...conditions,
      diseaseDeck: conditions.diseaseDeck?.filter((id) => id !== target.diseaseId) ?? null,
      diseaseDiscard: conditions.diseaseDiscard.filter((id) => id !== target.diseaseId),
      negativeDeck: conditions.negativeDeck?.filter((id) => !quirks.includes(id)) ?? null,
      ...(conditions.positiveDeck === undefined
        ? {}
        : { positiveDeck: conditions.positiveDeck?.filter((id) => !quirks.includes(id)) ?? null }),
      quirkDiscard: conditions.quirkDiscard.filter((id) => !quirks.includes(id)),
    },
    trinkets: {
      ...pools.trinkets,
      deck: pools.trinkets.deck === null ? null : withoutTrinkets(pools.trinkets.deck),
      discard: withoutTrinkets(pools.trinkets.discard),
      ...(pools.trinkets.display ? { display: withoutTrinkets(pools.trinkets.display) } : {}),
      ...(pools.trinkets.inactive
        ? {
            inactive: pools.trinkets.inactive.map((p) => ({
              ...p,
              deck: p.deck === null ? null : withoutTrinkets(p.deck),
              discard: withoutTrinkets(p.discard),
            })),
          }
        : {}),
      held: [
        ...pools.trinkets.held.filter((h) => !trinketIds.includes(h.cardId)),
        ...structuredClone(fallen.trinkets),
      ],
    },
    resolveCards: pools.resolveCards,
    resolveDecks: Object.fromEntries(
      Object.entries(pools.resolveDecks).map(([role, deck]) => [
        role,
        deck.filter((id) => id !== target.resolveCardId),
      ]),
    ),
  };
  const afterProblem =
    conditionPoolProblem(next.conditions!, nextHeroes) ??
    trinketPoolProblem(next.trinkets!, nextHeroes) ??
    resolveProblem(next, nextHeroes);
  return afterProblem
    ? refuse(afterProblem)
    : { status: "resolved", heroes: nextHeroes, pools: next };
}
