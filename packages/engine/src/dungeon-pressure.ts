import type { ApplyResult, GameEvent, GameState } from "./command";
import { resolvePressure } from "./pressure";
import { createRng, rollD10 } from "./rng";
import { completeDungeonBacktrack } from "./dungeon-backtracking";

/** R28：侦察支付压力后恢复；沿英雄数组顺序，完整牌堆与 RNG 游标属于本次地牢。 */
export function resolveDungeonPressure(state: GameState): ApplyResult {
  let d = state.dungeon!;
  const events: GameEvent[] = [];
  const blocked = (message: string): ApplyResult => ({
    state,
    events: [{ type: "dungeonUpdated", message }],
  });
  const catalog = d.resolveCards;
  if (
    catalog.length !== 10 ||
    new Set(catalog.map((c) => c.id)).size !== 10 ||
    catalog.some((c) => c.verification.unverified) ||
    ["virtue", "affliction"].some((role) => catalog.filter((c) => c.role === role).length !== 5)
  )
    return blocked("压力已支付；等待完整获批五美德 / 五苦难牌堆（R-048），未掷骰");
  const assigned = d.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (
    new Set(assigned).size !== assigned.length ||
    assigned.some((id) => !catalog.some((c) => c.id === id))
  )
    return blocked("英雄意志卡重复或未核实，保持停点");
  for (const role of ["virtue", "affliction"] as const) {
    const deck = d.resolveDecks[role];
    const available = catalog
      .filter((c) => c.role === role && !assigned.includes(c.id))
      .map((c) => c.id);
    if (
      deck &&
      (deck.length !== available.length ||
        new Set(deck).size !== deck.length ||
        deck.some((id) => !available.includes(id)))
    )
      return blocked("意志牌堆与已分配卡不一致，保持停点");
  }
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  for (const hero of d.heroes) {
    if (hero.dead || hero.stress !== 10) continue;
    let decision = resolvePressure(
      hero.stress,
      hero.resolveTested ?? false,
      hero.resolveCardId ?? null,
    );
    if (decision.type === "refused") return blocked(decision.reason);
    if (decision.type === "heartAttack") {
      d = { ...d, heroes: d.heroes.map((h) => (h.id === hero.id ? { ...h, dead: true } : h)) };
      events.push({
        type: "heartAttack",
        entityId: hero.id,
        message: "探索压力 10：已有美德 / 苦难，心脏病死亡（R28）",
      });
      continue;
    }
    if (decision.type !== "needsRoll") return blocked("意志检定状态无效");
    const roll = rollD10(rng);
    let cursor = d.cursor + 1;
    decision = resolvePressure(10, false, null, roll);
    if (decision.type !== "draw") return blocked("意志骰结果无效");
    const role = decision.role;
    const existing = d.resolveDecks[role];
    const deck = existing
      ? [...existing]
      : catalog
          .filter((c) => c.role === role && !d.heroes.some((h) => h.resolveCardId === c.id))
          .map((c) => c.id);
    if (!existing)
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
        cursor++;
      }
    const cardId = deck.shift();
    if (!cardId) return blocked("意志牌堆耗尽，拒绝补牌");
    d = {
      ...d,
      cursor,
      resolveDecks: { ...d.resolveDecks, [role]: deck },
      heroes: d.heroes.map((h) =>
        h.id === hero.id ? { ...h, stress: 0, resolveTested: true, resolveCardId: cardId } : h,
      ),
    };
    events.push({
      type: "resolveTested",
      entityId: hero.id,
      roll,
      cardId,
      message: "探索首次意志检定：抽取意志卡，压力归零（R28）；不触发战斗回合效果",
    });
  }
  if (d.heroes.some((h) => h.dead)) {
    d = { ...d, phase: "awaitingReplacement", scoutBonus: false };
    events.push({
      type: "dungeonUpdated",
      message: "已记录心脏病；等待驿站替换接口（R9），未揭示房间，不推定战役失败",
    });
  } else if (d.pressureSource === "backtracking") {
    const completed = completeDungeonBacktrack({ ...state, dungeon: d });
    return { ...completed, events: [...events, ...completed.events] };
  } else if (d.pressureSource === "exploration") {
    d = { ...d, phase: "awaitingHazards", pending: null };
    events.push({ type: "dungeonUpdated", message: "意志检定完成，续接剩余探索骰；不触发侦察" });
  } else {
    const nearby = d.layout.edges.flatMap(([a, b]) =>
      a === d.position ? [b] : b === d.position ? [a] : [],
    );
    d = {
      ...d,
      phase: "ready",
      scoutBonus: true,
      rooms: d.rooms.map((r) => (nearby.includes(r.id) ? { ...r, revealed: true } : r)),
    };
    events.push({ type: "dungeonUpdated", message: "意志检定完成，续接侦察揭示；下次探索减骰" });
  }
  return { state: { ...state, dungeon: d }, events };
}
