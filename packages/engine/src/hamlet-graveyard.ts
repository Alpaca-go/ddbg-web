import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";

/** R34 / §4.5、R28：免费抽美德，不掷意志骰、不归零压力；持牌后压力10直接死亡。 */
export function grantGraveyardVirtue(
  d: DungeonState,
  heroId: string,
  seed: number,
):
  | { readonly status: "resolved"; readonly dungeon: DungeonState }
  | { readonly status: "refused"; readonly reason: string } {
  const hero = d.heroes.find((h) => h.id === heroId),
    cards = d.resolveCards;
  if (
    !hero ||
    hero.dead ||
    hero.resolveCardId ||
    hero.resolveTested ||
    hero.combat?.resolveCardId ||
    hero.combat?.resolveTested
  )
    return {
      status: "refused",
      reason: "墓地当前仅接没有意志卡的英雄；重复获得意志卡待确认（Q-79）",
    };
  if (
    cards.length !== 10 ||
    new Set(cards.map((c) => c.id)).size !== 10 ||
    cards.some((c) => c.verification.unverified) ||
    ["virtue", "affliction"].some((role) => cards.filter((c) => c.role === role).length !== 5) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 4)
  )
    return { status: "refused", reason: "墓地缺完整获批五美德/五苦难牌池或有效RNG游标（R-048）" };
  const held = d.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (
    new Set(held).size !== held.length ||
    held.some((id) => !cards.some((c) => c.id === id)) ||
    ["virtue", "affliction"].some((role) => {
      const deck = d.resolveDecks[role as "virtue" | "affliction"];
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
  const existing = d.resolveDecks.virtue,
    deck = existing
      ? [...existing]
      : cards.filter((c) => c.role === "virtue" && !held.includes(c.id)).map((c) => c.id);
  let cursor = d.cursor;
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
      ...d,
      cursor,
      resolveDecks: { ...d.resolveDecks, virtue: deck },
      heroes: d.heroes.map((h) =>
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
