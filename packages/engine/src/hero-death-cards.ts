import type { ApplyResult } from "./command";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { createRng } from "./rng";

/** R31、R-091：实时死者持有的共享卡立即洗回；不回收其他弃牌、不转换怪癖。 */
export function releaseDeadHeroCards(result: ApplyResult): ApplyResult {
  const state = result.state,
    d = state.dungeon;
  if (!d) return result;
  const b = state.battle,
    heroes = b ? b.entities.filter((e) => e.side === "hero") : d.heroes,
    dead = heroes.filter((h) => h.dead),
    diseases = dead.flatMap((h) => (h.diseaseId ? [h.diseaseId] : [])),
    quirks = dead.flatMap((h) => h.quirkIds ?? []),
    resolves = dead.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (!diseases.length && !quirks.length && !resolves.length) return result;
  const refuse = (reason: string) => rejectBattleCommand(state, reason);
  let conditions = b?.conditions ?? d.conditions;
  let resolveDecks = b?.resolveDecks ?? d.resolveDecks;
  let cursor = b?.rngCursor ?? d.cursor;
  if (
    !Number.isSafeInteger(state.seed) ||
    state.seed < 0 ||
    state.seed > 0xffffffff ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0 ||
    !Number.isSafeInteger(cursor + 100)
  )
    return refuse("死亡回收RNG游标无效（R-091）");
  if (diseases.length || quirks.length) {
    if (!conditions) return refuse("死者持牌缺少疾病/怪癖池，未回收（R-048）");
    const problem = conditionPoolProblem(conditions, heroes);
    if (problem) return refuse(problem);
  }
  const cards = b?.resolveCards ?? d.resolveCards;
  const held = heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (resolves.length) {
    if (
      cards.length !== 10 ||
      new Set(cards.map((c) => c.id)).size !== 10 ||
      cards.some((c) => c.verification.unverified) ||
      new Set(held).size !== held.length ||
      held.some((id) => !cards.some((c) => c.id === id))
    )
      return refuse("死亡回收需要完整且持牌唯一的意志牌池（R-048）");
    for (const role of ["affliction", "virtue"] as const) {
      const available = cards.filter((c) => c.role === role && !held.includes(c.id));
      const deck = resolveDecks[role];
      if (
        cards.filter((c) => c.role === role).length !== 5 ||
        (deck &&
          (deck.length !== available.length ||
            new Set(deck).size !== deck.length ||
            deck.some((id) => !available.some((c) => c.id === id))))
      )
        return refuse("死亡回收前意志牌堆不守恒，未洗牌（R-091）");
    }
  }
  const rng = createRng(state.seed);
  for (let i = 0; i < cursor; i++) rng.next();
  const shuffle = (values: readonly string[]) => {
    const deck = [...values];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
    return deck;
  };
  if (conditions && (diseases.length || quirks.length)) {
    const pool = conditions;
    const heldDiseases = heroes.flatMap((h) => (h.diseaseId ? [h.diseaseId] : []));
    const heldQuirks = heroes.flatMap((h) => h.quirkIds ?? []);
    if (diseases.length)
      conditions = {
        ...conditions,
        diseaseDeck: shuffle([
          ...(pool.diseaseDeck ??
            pool.diseases
              .filter((c) => !heldDiseases.includes(c.id) && !pool.diseaseDiscard.includes(c.id))
              .map((c) => c.id)),
          ...diseases,
        ]),
      };
    for (const polarity of ["negative", "positive"] as const) {
      const returned = quirks.filter((id) =>
        pool.quirks.some((c) => c.id === id && c.polarity === polarity),
      );
      if (!returned.length) continue;
      const key = polarity === "negative" ? "negativeDeck" : "positiveDeck";
      conditions = {
        ...conditions,
        [key]: shuffle([
          ...(pool[key] ??
            pool.quirks
              .filter(
                (c) =>
                  c.polarity === polarity &&
                  !heldQuirks.includes(c.id) &&
                  !pool.quirkDiscard.includes(c.id) &&
                  pool.incomingQuirk?.cardId !== c.id,
              )
              .map((c) => c.id)),
          ...returned,
        ]),
      };
    }
  }
  for (const role of ["affliction", "virtue"] as const) {
    const returned = resolves.filter((id) => cards.some((c) => c.id === id && c.role === role));
    if (returned.length)
      resolveDecks = {
        ...resolveDecks,
        [role]: shuffle([
          ...(resolveDecks[role] ??
            cards.filter((c) => c.role === role && !held.includes(c.id)).map((c) => c.id)),
          ...returned,
        ]),
      };
  }
  const ids = new Set(dead.map((h) => h.id));
  const clear = <T extends { readonly id: string }>(h: T): T =>
    ids.has(h.id) ? { ...h, diseaseId: null, quirkIds: [], resolveCardId: undefined } : h;
  const dungeonHeroes = d.heroes.map((h) =>
    ids.has(h.id) ? { ...clear(h), ...(h.combat ? { combat: clear(h.combat) } : {}) } : h,
  );
  const nextHeroes = heroes.map(clear);
  if (conditions) {
    const problem = conditionPoolProblem(conditions, nextHeroes);
    if (problem) return refuse(problem);
  }
  return {
    ...result,
    state: {
      ...state,
      dungeon: {
        ...d,
        heroes: dungeonHeroes,
        // 战斗内只有Battle游标推进；战后交接再写回Dungeon。
        ...(!b ? { cursor } : {}),
        resolveDecks,
        ...(conditions ? { conditions } : {}),
      },
      ...(b
        ? {
            battle: {
              ...b,
              entities: b.entities.map(clear),
              rngCursor: cursor,
              resolveDecks,
              ...(conditions ? { conditions } : {}),
            },
          }
        : {}),
    },
    events: [
      ...result.events,
      {
        type: "dungeonUpdated",
        message: "死者疾病/怪癖/美德/苦难立即洗回对应堆；保留存活者持牌，不转怪癖（R31、R-091）",
      },
    ],
  };
}
