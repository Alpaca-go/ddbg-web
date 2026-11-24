import type { ApplyResult, GameState } from "../shared/core/command";
import { rejectBattleCommand } from "../shared/battle/battle";
import { applyBattleSkillStatuses } from "../shared/battle/battle-skill-status";
import { fixedDamageResolution } from "../shared/battle/battle-spiked-pit";
import { isNecroticFungusEntity } from "./necrotic-fungus";

export function wealdTaskActive(state: GameState, page: number): boolean {
  const d = state.dungeon;
  return (
    d?.wealdHigherQuestOffers === "tasks-v1" &&
    d.contentPacks?.includes("weald") === true &&
    d.questDistribution?.questId === `quest:weald:p${String(page).padStart(3, "0")}`
  );
}

function blight(result: ApplyResult, amount: number, stacks: number, key: string): ApplyResult {
  if (result.events.some((e) => e.type === "dungeonUpdated" && e.message === key)) return result;
  const b = result.state.battle!;
  const resolutions = b.entities
    .filter((e) => e.side === "hero" && !e.dead)
    .map((e) => ({
      ...fixedDamageResolution(e, "quest:weald:blight"),
      targetStatusEffects: Array.from({ length: stacks }, () => ({
        kind: "blight" as const,
        amount,
        duration: 2,
      })),
    }));
  const statuses = applyBattleSkillStatuses(
    b,
    b.entities,
    "",
    resolutions,
    result.state.seed,
    b.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(result.state, statuses.reason);
  return {
    state: {
      ...result.state,
      battle: { ...b, entities: statuses.entities, rngCursor: statuses.rngCursor },
    },
    events: [...result.events, ...statuses.events, { type: "dungeonUpdated", message: key }],
  };
}

/** R-265：初始部署和后续召唤按只触发，通用怪／真菌不触发。 */
export function applyFinalSwipeSpawn(original: GameState, result: ApplyResult): ApplyResult {
  if (
    result.events.some((e) => e.type === "commandRefused") ||
    !wealdTaskActive(result.state, 13) ||
    !result.state.battle?.encounter
  )
    return result;
  const initial =
    result.events.some((e) => e.type === "roundStarted" && e.round === 1) &&
    !original.battle?.encounter;
  const spawned = result.state.battle.entities.filter(
    (e) =>
      e.side === "monster" &&
      !e.dead &&
      !isNecroticFungusEntity(e) &&
      e.monsterCardId?.includes(":weald:") &&
      (initial || !original.battle?.entities.some((old) => old.id === e.id && !old.dead)),
  );
  let next = result;
  for (const entity of spawned) {
    next = blight(next, 1, 1, `Final Swipe：生成 ${entity.id}，全体英雄腐蚀1／2t（R-265）`);
    if (next.events.some((e) => e.type === "commandRefused")) return next;
  }
  return next;
}

/** R-265：在共用死亡清理之前施加两份独立堆，末只也不跳过。 */
export function applyInfectedDeaths(result: ApplyResult, ids: readonly string[]): ApplyResult {
  if (
    !wealdTaskActive(result.state, 14) ||
    !result.state.battle ||
    result.state.dungeon?.rooms.find((r) => r.id === result.state.dungeon!.position)?.kind !==
      "lair"
  )
    return result;
  let next = result;
  for (const entity of result.state.battle.entities.filter(
    (e) => e.side === "monster" && e.dead && ids.includes(e.id) && !isNecroticFungusEntity(e),
  )) {
    next = blight(next, 2, 2, `The Infected：击杀 ${entity.id}，全体英雄两份腐蚀2／2t（R-265）`);
    if (next.events.some((e) => e.type === "commandRefused")) return next;
  }
  return next;
}

export function recordTaskViragoDeaths(result: ApplyResult, ids: readonly string[]): ApplyResult {
  if (!wealdTaskActive(result.state, 6) || !result.state.battle) return result;
  let next = result;
  for (const entity of result.state.battle.entities.filter(
    (e) => e.dead && e.monsterCardId === "monster_medium:weald:p018" && ids.includes(e.id),
  )) {
    const key = `Spreaders of Miasma：击杀 ${entity.id}（R-265）`;
    if (next.events.some((e) => e.type === "dungeonUpdated" && e.message === key)) continue;
    next = {
      state: {
        ...next.state,
        dungeon: {
          ...next.state.dungeon!,
          wealdViragoKills: (next.state.dungeon!.wealdViragoKills ?? 0) + 1,
        },
      },
      events: [...next.events, { type: "dungeonUpdated", message: key }],
    };
  }
  return next;
}
