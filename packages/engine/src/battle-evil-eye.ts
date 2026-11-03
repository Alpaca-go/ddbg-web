import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { gainNegativeQuirk, gainPositiveQuirk, replaceConditionQuirk } from "./conditions";
import { endAfterCasualties, finishTurn, newlyDefeatedIds, removeCasualties } from "./encounter";
import { triggerBattlePassive } from "./battle-passive";
import { resolveBattlePressure } from "./pressure";

/** R-160：仅处理尚未摧毁时的两类回合结束效果。 */
export function endTurnEvilEye(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const b = state.battle!;
  const actor = b.entities.find((e) => e.id === actorId)!;
  if (actor.dead || actor.side !== "hero") return null;
  const area = b.areas.find((a) => a.id === actor.areaId);
  if (area?.staringEyes) {
    const paid = triggerBattlePassive(b, state.seed, [actorId], { type: "stress", amount: 2 });
    if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
    const pressure = resolveBattlePressure({
      state: { ...state, battle: paid.battle },
      events: [
        ...events,
        ...paid.events,
        {
          type: "areaStressResolved",
          actorId,
          message: "Staring Eyes：英雄结束回合压力 +2（R-160）",
        },
      ],
    });
    if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
    const result = removeCasualties(pressure, newlyDefeatedIds(b, pressure.state.battle!.entities));
    return endAfterCasualties(result) ?? result;
  }
  if (!area?.evilGaze || b.evilEyeDestroyed) return null;
  return gainEyeQuirk(state, actorId, events, false);
}

function gainEyeQuirk(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
  destroyed: boolean,
): ApplyResult {
  const b = state.battle!;
  if (!b.conditions) return rejectBattleCommand(state, "Evil Gaze需要完整怪癖池（R26、R-160）");
  const gained = (destroyed ? gainPositiveQuirk : gainNegativeQuirk)(
    b.conditions,
    b.entities.filter((e) => e.side === "hero"),
    actorId,
    state.seed,
    b.rngCursor,
  );
  if (gained.status === "refused") return rejectBattleCommand(state, gained.reason);
  const next = {
    ...state,
    battle: {
      ...b,
      conditions: gained.pool,
      rngCursor: gained.cursor,
      entities: b.entities.map((e) => gained.heroes.find((h) => h.id === e.id) ?? e),
    },
  };
  const recorded: readonly GameEvent[] = [
    ...events,
    {
      type: "passiveTriggered",
      entityId: actorId,
      trigger: "evilGaze",
      message: `Evil Eye：获得${destroyed ? "正面" : "负面"}怪癖 ${gained.quirkId}（R26、R-160）`,
    },
  ];
  if (gained.replaceOptions) {
    const choice = {
      id: `evil-eye:${b.choiceCursor}`,
      prompt: "第四张怪癖：替换正面怪癖或弃掉新正面卡",
      options: gained.replaceOptions.map((id) => ({
        id,
        label: b.conditions!.quirks.find((q) => q.id === id)!.name,
      })),
    };
    return {
      state: {
        ...next,
        battle: {
          ...next.battle,
          choiceCursor: b.choiceCursor + 1,
          pending: { type: "evilEyeQuirk", actorId, choice, events: recorded, destroyed },
        },
      },
      events: recorded,
      pendingChoice: choice,
    };
  }
  const result = removeCasualties(
    { state: next, events: recorded },
    newlyDefeatedIds(b, next.battle.entities),
  );
  return endAfterCasualties(result) ?? (destroyed ? finishDestroyEye(result, actorId) : result);
}

export function chooseEvilEyeQuirk(state: GameState, optionId: string): ApplyResult {
  const b = state.battle!;
  const pending = b.pending;
  if (pending?.type !== "evilEyeQuirk" || !b.conditions)
    return rejectBattleCommand(state, "Evil Eye怪癖选择已过期");
  const applied = replaceConditionQuirk(
    b.conditions,
    b.entities.filter((e) => e.side === "hero"),
    optionId,
  );
  if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
  const next: GameState = {
    ...state,
    battle: {
      ...b,
      pending: null,
      conditions: applied.pool,
      entities: b.entities.map((e) => applied.heroes.find((h) => h.id === e.id) ?? e),
    },
  };
  return pending.destroyed
    ? finishDestroyEye({ state: next, events: pending.events }, pending.actorId)
    : finishTurn(next, pending.actorId, pending.events, true);
}

/** R-170：毁眼每场一次，关闭E区负面怪癖，其他凝视区保留。 */
export function destroyEvilEye(state: GameState, actorId: string): ApplyResult {
  const b = state.battle,
    turn = b?.encounter?.turn;
  const hero = b?.entities.find((e) => e.id === actorId);
  if (
    !b ||
    turn?.type !== "hero" ||
    turn.actorId !== actorId ||
    turn.actions < 2 ||
    turn.mustMove ||
    !hero ||
    hero.dead ||
    hero.side !== "hero" ||
    !b.areas.find((a) => a.id === hero.areaId)?.evilGaze ||
    b.evilEyeDestroyed ||
    b.pending ||
    b.shuffleIntents.length ||
    b.shuffleContinuation
  )
    return rejectBattleCommand(
      state,
      "毁眼需要当前存活英雄在E区、有2行动且眼睛尚未摧毁（R-160/170）",
    );
  return gainEyeQuirk(
    {
      ...state,
      battle: {
        ...b,
        evilEyeDestroyed: true,
        encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions - 2 } },
      },
    },
    actorId,
    [
      {
        type: "roomInteractionResolved",
        actorId,
        message: "Evil Eye：花2行动摧毁眼睛（R-160/170）",
      },
    ],
    true,
  );
}

function finishDestroyEye(result: ApplyResult, actorId: string): ApplyResult {
  const b = result.state.battle!;
  const ids = ["aggressive", "defensive", "ranged", "support"].flatMap((stance) =>
    b.entities.filter((e) => e.side === "hero" && !e.dead && e.stance === stance).map((e) => e.id),
  );
  const paid = triggerBattlePassive(b, result.state.seed, ids, { type: "stress", amount: -5 });
  if (paid.status === "refused") return rejectBattleCommand(result.state, paid.reason);
  const pressure = resolveBattlePressure({
    state: { ...result.state, battle: paid.battle },
    events: [...result.events, ...paid.events],
  });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const settled = removeCasualties(pressure, newlyDefeatedIds(b, pressure.state.battle!.entities));
  return endAfterCasualties(settled) ?? finishTurn(settled.state, actorId, settled.events);
}
