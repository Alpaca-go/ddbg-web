import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { resolveHeroHealth } from "./hero-health";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;
function problem(state: GameState) {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.hamlet?.active !== "hamlet_event:p010" ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    STANCES.some((s) => d.heroes.filter((h) => h.stance === s).length !== 1) ||
    !d.conditions ||
    d.conditions.incomingQuirk ||
    !d.battleCatalog ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.decision) ||
    d.decision < 0 ||
    !Number.isSafeInteger(d.decision + 4)
  )
    return "The Feast须在完整回村、四名存活英雄与完整事件牌池下结算（R32）";
  for (const hero of d.heroes) {
    const stat = d.battleCatalog.heroStats.find((s) => s.id === hero.heroStatId);
    if (
      !hero.id ||
      hero.dead ||
      !hero.attributesVerified ||
      !stat?.attributesVerified ||
      stat.level !== hero.level ||
      (hero.heroLevel !== undefined && hero.heroLevel !== hero.level) ||
      hero.life !== stat.life ||
      hero.wounds === undefined ||
      !Number.isSafeInteger(hero.stress) ||
      hero.stress < 0 ||
      hero.stress > 9 ||
      resolveHeroHealth(
        { life: hero.life!, wounds: hero.wounds!, dead: false },
        { type: "heal", amount: 0 },
      ).status !== "resolved"
    )
      return "The Feast缺已核实等级/Life，或英雄生命/压力状态无效（R-048）";
  }
  return conditionPoolProblem(d.conditions, d.heroes) ?? hamletEventCompletionProblem(d);
}
function continueFeast(state: GameState): ApplyResult {
  const d = state.dungeon!,
    h = d.hamlet!,
    actorId = h.eventRemainingHeroes?.[0];
  if (!actorId) return completeHamletEvent(state);
  const pending = {
    id: `hamlet-feast:${d.decision}`,
    actorId,
    prompt: `The Feast：${actorId}可完全恢复压力或移除全部伤口，或放弃（卡面p10、R-086）`,
    options: [
      { id: "stress", label: "完全恢复压力（归零）" },
      { id: "wounds", label: "移除全部伤口（不套治疗数值修正）" },
      { id: "skip", label: "放弃本次恢复" },
    ],
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}
/** 卡面p10、R-086：每名英雄可选择一项恢复；全部结束才洗回并开始一天准备。 */
export function beginFeast(state: GameState): ApplyResult {
  const reason = problem(state);
  if (reason || state.dungeon?.pending) return rejectBattleCommand(state, reason ?? "当前有待选");
  const d = state.dungeon!;
  const order = STANCES.map((stance) => d.heroes.find((h) => h.stance === stance)!.id);
  return continueFeast({
    ...state,
    dungeon: { ...d, hamlet: { ...d.hamlet!, eventRemainingHeroes: order } },
  });
}
export function chooseFeast(state: GameState, choiceId: string, optionId: string): ApplyResult {
  const reason = problem(state),
    d = state.dungeon,
    h = d?.hamlet,
    p = d?.pending;
  const order = h?.eventRemainingHeroes;
  if (
    reason ||
    !d ||
    !h ||
    !p ||
    !p.id.startsWith("hamlet-feast:") ||
    p.id !== choiceId ||
    !Array.isArray(order) ||
    !order.length ||
    order.length > 4 ||
    new Set(order).size !== order.length ||
    order.some((id) => !d.heroes.some((hero) => hero.id === id)) ||
    p.actorId !== order[0] ||
    !["stress", "wounds", "skip"].includes(optionId) ||
    !p.options.some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, reason ?? "The Feast选择无效或已过期");
  const next = continueFeast({
    ...state,
    dungeon: {
      ...d,
      pending: null,
      heroes: d.heroes.map((hero) => {
        if (hero.id !== p.actorId || optionId === "skip") return hero;
        const wounds = optionId === "wounds" ? 0 : hero.wounds!,
          stress = optionId === "stress" ? 0 : hero.stress;
        return {
          ...hero,
          wounds,
          stress,
          ...(hero.combat ? { combat: { ...hero.combat, wounds, stress } } : {}),
        };
      }),
      hamlet: { ...h, eventRemainingHeroes: order.slice(1) },
    },
  });
  return {
    ...next,
    events: [
      {
        type: "dungeonUpdated",
        message: `The Feast：${p.actorId}${optionId === "skip" ? "放弃恢复" : optionId === "stress" ? "压力归零" : "全部伤口归零，不应用Infirm/Fast Healer修正"}（卡面p10、R-086）`,
      },
      ...next.events,
    ],
  };
}
