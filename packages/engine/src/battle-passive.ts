import { healingTrinketReaction } from "./trinket-reactions";
import type { BattleState } from "./battle";
import type { GameEvent } from "./command";
import { readHeroPassiveDefence } from "./battle-skill-status";
import { healingForbidden } from "./battle-healing";
import { clearAncestorConditions } from "./battle-ancestor";
import { applyPassiveHero } from "./passive-runtime";
import type { PassiveInput } from "./passive-runtime";
import type { ApplyResult, GameState } from "./command";
import { endAfterCasualties, finishTurn, newlyDefeatedIds, removeCasualties } from "./encounter";

export function cancelSkillAfterRoll(
  state: GameState,
  actorId: string,
  health: {
    readonly entities: BattleState["entities"];
    readonly rngCursor: number;
    readonly events: readonly GameEvent[];
  },
  before: BattleState = state.battle!,
): ApplyResult {
  const result: ApplyResult = {
    state: {
      ...state,
      battle: { ...state.battle!, entities: health.entities, rngCursor: health.rngCursor },
    },
    events: health.events,
  };
  if (!state.battle?.encounter) return result;
  const removed = removeCasualties(result, newlyDefeatedIds(before, health.entities));
  return endAfterCasualties(removed) ?? finishTurn(removed.state, actorId, removed.events);
}

export function triggerBattlePassive(
  battle: BattleState,
  seed: number,
  entityIds: readonly string[],
  trigger: PassiveInput,
  options: { readonly omitStress?: boolean } = {},
):
  | { status: "refused"; reason: string }
  | { status: "resolved"; battle: BattleState; events: readonly GameEvent[] } {
  let next = battle;
  const events: GameEvent[] = [];
  for (const id of entityIds) {
    const hero = next.entities.find((e) => e.id === id && e.side === "hero");
    if (!hero) return { status: "refused", reason: "被动触发接收者必须为英雄" };
    const applied = applyPassiveHero(
      hero,
      trigger,
      seed,
      next.rngCursor,
      next.light,
      next.provisions,
      readHeroPassiveDefence(next, hero),
      {
        ...options,
        healingForbidden: healingForbidden(next, id),
        healingReaction: (amount) => healingTrinketReaction(next, undefined, id, amount),
      },
    );
    if (applied.status === "refused") return applied;
    next = {
      ...next,
      entities: clearAncestorConditions(
        next.areas,
        next.entities.map((e) => (e.id === id ? applied.hero : e)),
      ),
      rngCursor: applied.cursor,
      ...(next.provisions ? { provisions: applied.provisions } : {}),
    };
    events.push(...applied.events);
  }
  return { status: "resolved", battle: next, events };
}
