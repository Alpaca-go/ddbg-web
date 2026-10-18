import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";

/** R-091 风格：把一张意志卡洗回对应角色牌堆（美德→美德堆，苦难→苦难堆）。 */
function returnResolveToRoleDeck(
  d: DungeonState,
  heroId: string,
  cardId: string,
  seed: number,
):
  | { readonly status: "resolved"; readonly dungeon: DungeonState }
  | { readonly status: "refused"; readonly reason: string } {
  const card = d.resolveCards.find((c) => c.id === cardId);
  if (!card || (card.role !== "virtue" && card.role !== "affliction"))
    return { status: "refused", reason: "墓地归还意志卡不在完整获批牌池（R-048）" };
  const held = d.heroes.flatMap((h) =>
    h.id !== heroId && h.resolveCardId ? [h.resolveCardId] : [],
  );
  if (held.includes(cardId))
    return { status: "refused", reason: "墓地归还意志卡仍被其他英雄持有，未换卡" };
  const role = card.role;
  const available = d.resolveCards
    .filter((c) => c.role === role && !held.includes(c.id) && c.id !== cardId)
    .map((c) => c.id);
  const existing = d.resolveDecks[role];
  if (
    existing &&
    (existing.length !== available.length ||
      new Set(existing).size !== existing.length ||
      existing.some((id) => !available.includes(id)))
  )
    return { status: "refused", reason: "墓地归还前意志牌堆不守恒，未换卡（R-099）" };
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0 || !Number.isSafeInteger(d.cursor + 8))
    return { status: "refused", reason: "墓地归还缺有效RNG游标（R-048）" };
  const deck = [...(existing ?? available), cardId];
  const rng = createRng(seed);
  let cursor = d.cursor;
  for (let i = 0; i < cursor; i++) rng.next();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    cursor++;
  }
  return {
    status: "resolved",
    dungeon: {
      ...d,
      cursor,
      resolveDecks: { ...d.resolveDecks, [role]: deck },
      heroes: d.heroes.map((h) =>
        h.id === heroId
          ? {
              ...h,
              resolveCardId: undefined,
              ...(h.combat ? { combat: { ...h.combat, resolveCardId: null } } : {}),
            }
          : h,
      ),
    },
  };
}

/**
 * R34 / §4.5、R28、R-099：免费抽美德，不掷意志骰、不归零压力；持牌后压力10直接死亡。
 * 已有意志卡时：旧卡洗回对应牌堆（R-091 惯例），再抽新美德。
 */
export function grantGraveyardVirtue(
  d: DungeonState,
  heroId: string,
  seed: number,
):
  | { readonly status: "resolved"; readonly dungeon: DungeonState }
  | { readonly status: "refused"; readonly reason: string } {
  const hero = d.heroes.find((h) => h.id === heroId);
  if (!hero || hero.dead)
    return { status: "refused", reason: "墓地目标英雄无效或已死亡，未抽卡或消耗行动" };
  const oldId = hero.resolveCardId ?? hero.combat?.resolveCardId ?? null;
  let working = d;
  if (oldId) {
    const returned = returnResolveToRoleDeck(d, heroId, oldId, seed);
    if (returned.status === "refused") return returned;
    working = returned.dungeon;
  }
  const cards = working.resolveCards;
  if (
    cards.length !== 10 ||
    new Set(cards.map((c) => c.id)).size !== 10 ||
    cards.some((c) => c.verification.unverified) ||
    ["virtue", "affliction"].some((role) => cards.filter((c) => c.role === role).length !== 5) ||
    !Number.isSafeInteger(working.cursor) ||
    working.cursor < 0 ||
    !Number.isSafeInteger(working.cursor + 4)
  )
    return { status: "refused", reason: "墓地缺完整获批五美德/五苦难牌池或有效RNG游标（R-048）" };
  const held = working.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (
    new Set(held).size !== held.length ||
    held.some((id) => !cards.some((c) => c.id === id)) ||
    ["virtue", "affliction"].some((role) => {
      const deck = working.resolveDecks[role as "virtue" | "affliction"];
      const available = cards
        .filter((c) => c.role === role && !held.includes(c.id))
        .map((c) => c.id);
      return (
        deck &&
        (deck.length !== available.length ||
          new Set(deck).size !== deck.length ||
          deck.some((id) => !available.includes(id)))
      );
    })
  )
    return { status: "refused", reason: "墓地意志持牌/牌堆不守恒，未抽卡或消耗行动" };
  const existing = working.resolveDecks.virtue,
    deck = existing
      ? [...existing]
      : cards.filter((c) => c.role === "virtue" && !held.includes(c.id)).map((c) => c.id);
  let cursor = working.cursor;
  if (!existing) {
    const rng = createRng(seed);
    for (let i = 0; i < cursor; i++) rng.next();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
  }
  const cardId = deck.shift();
  if (!cardId) return { status: "refused", reason: "墓地美德牌堆耗尽，不补牌" };
  return {
    status: "resolved",
    dungeon: {
      ...working,
      cursor,
      resolveDecks: { ...working.resolveDecks, virtue: deck },
      heroes: working.heroes.map((h) =>
        h.id === heroId
          ? {
              ...h,
              resolveCardId: cardId,
              resolveTested: true,
              ...(h.combat
                ? { combat: { ...h.combat, resolveCardId: cardId, resolveTested: true } }
                : {}),
            }
          : h,
      ),
    },
  };
}
