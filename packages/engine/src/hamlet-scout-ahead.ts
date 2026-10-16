import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { applyPassiveHero } from "./passive-runtime";
import { finishHamletAction } from "./hamlet-actions";
import { resolveDungeonPressure } from "./dungeon-pressure";

type Hero = DungeonState["heroes"][number];
export function scoutAheadPlanProblem(count: number | undefined): string | null {
  return count === undefined || (Number.isSafeInteger(count) && count > 0 && count <= 8)
    ? null
    : "Scout Ahead揭示次数无效，未支付或出征（Hero STAT FRONT p5）";
}

/** R33、Hero STAT FRONT p5：花当天行动，自身压力+1，记录下次地牢的一次揭示。 */
export function useScoutAhead(state: GameState, hero: Hero): ApplyResult {
  const d = state.dungeon!;
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId);
  const count = d.nextQuestRoomReveals ?? 0;
  if (
    !hero.attributesVerified ||
    stat?.id !== "hero_stat:p005:front" ||
    !stat.attributesVerified ||
    stat.name !== "BOUNTY HUNTER" ||
    stat.level !== 1 ||
    hero.level !== 1 ||
    scoutAheadPlanProblem(d.nextQuestRoomReveals) ||
    count >= 8
  )
    return rejectBattleCommand(state, "Scout Ahead只接已核实赏金猎人I，揭示计划须有效（R-048）");
  // 村庄没有地牢低光照；保留The Worries等既有压力/伤口被动。
  const applied = applyPassiveHero(hero, { type: "stress", amount: 1 }, state.seed, d.cursor, 5);
  if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
  const paid: GameState = {
    ...state,
    dungeon: {
      ...d,
      cursor: applied.cursor,
      heroes: d.heroes.map((h) => (h.id === hero.id ? syncHero(applied.hero) : h)),
      hamletScoutActorId: hero.id,
      pressureSource: "hamletScout",
      phase: "blockedPressure",
    },
  };
  const continued =
    applied.hero.stress === 10 && !applied.hero.dead
      ? resolveDungeonPressure(paid)
      : completeScoutAheadAction(paid);
  return {
    ...continued,
    events: [
      ...applied.events,
      {
        type: "dungeonUpdated",
        message: "Scout Ahead：自身压力+1（Hero STAT FRONT p5、R33、R-090）",
      },
      ...continued.events,
    ],
  };
}

function syncHero(hero: Hero): Hero {
  return hero.combat
    ? {
        ...hero,
        combat: {
          ...hero.combat,
          stress: hero.stress,
          wounds: hero.wounds!,
          dead: hero.dead ?? false,
          resolveTested: hero.resolveTested ?? false,
          resolveCardId: hero.resolveCardId ?? null,
        },
      }
    : hero;
}

/** R-090：村庄获得意志卡后不重置，下次任务继续沿用；死亡停在既有补人接口。 */
export function completeScoutAheadAction(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const actor = d.heroes.find((h) => h.id === d.hamletScoutActorId);
  if (!actor || !d.hamletReturn || d.pressureSource !== "hamletScout")
    return rejectBattleCommand(state, "Scout Ahead压力续接缺少行动人");
  const heroes = d.heroes.map((h) => (h.id === actor.id ? syncHero(h) : h));
  if (heroes.some((h) => h.dead))
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          heroes,
          phase: "inHamlet",
          hamletReturn: { ...d.hamletReturn, phase: "awaitingReplacement" },
          replacementResume: "hamletScout",
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: "Scout Ahead压力导致死亡，等待补人后续接；未发揭示奖励（R31、R-090）",
        },
      ],
    };
  const { hamletScoutActorId: _actor, pressureSource: _source, ...rest } = d;
  void _actor;
  void _source;
  const next = finishHamletAction(
    { ...rest, heroes, phase: "inHamlet", nextQuestRoomReveals: (d.nextQuestRoomReveals ?? 0) + 1 },
    actor.id,
    false,
  );
  return {
    state: { ...state, dungeon: next },
    events: [
      {
        type: "dungeonUpdated",
        message: "Scout Ahead：记录下次地牢揭示一个房间，完成当天行动（Hero STAT FRONT p5、R33）",
      },
    ],
  };
}

/** 开局补给及改骰结束后、第一次探索前，队伍从未揭示房间中选择；不抽Room卡或减探索骰。 */
export function beginScoutAheadReveal(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const count = d.nextQuestRoomReveals;
  if (count === undefined) return { state, events: [] };
  const problem = scoutAheadPlanProblem(count);
  const rooms = d.rooms.filter((r) => !r.revealed);
  if (
    problem ||
    d.pending ||
    state.battle ||
    d.phase !== "ready" ||
    d.position !== "S" ||
    rooms.length < count
  )
    return rejectBattleCommand(state, problem ?? "Scout Ahead须在开局完成后揭示有效房间");
  const pending = {
    id: `dungeon-scout-ahead:${d.decision}`,
    actorId: "party",
    prompt: `Scout Ahead：选择揭示一个房间（还剩${count}次）`,
    options: rooms.map((r) => ({ id: r.id, label: `揭示房间 ${r.id}` })),
  };
  return {
    state: {
      ...state,
      dungeon: { ...d, pending, phase: "awaitingScoutAhead", decision: d.decision + 1 },
    },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}

export function chooseScoutAheadReveal(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon;
  const count = d?.nextQuestRoomReveals;
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingScoutAhead" ||
    d.position !== "S" ||
    count === undefined ||
    scoutAheadPlanProblem(count) ||
    !d.pending?.id.startsWith("dungeon-scout-ahead:") ||
    d.pending.id !== choiceId ||
    d.pending.actorId !== "party" ||
    !d.pending.options.some((o) => o.id === optionId) ||
    !d.rooms.some((r) => r.id === optionId && !r.revealed) ||
    !d.layout.nodes.some((n) => n.kind === "room" && n.id === optionId)
  )
    return rejectBattleCommand(state, "Scout Ahead房间选择无效或已过期");
  const { nextQuestRoomReveals: _count, ...rest } = d;
  void _count;
  const next: GameState = {
    ...state,
    dungeon: {
      ...rest,
      pending: null,
      phase: "ready",
      decision: d.decision + 1,
      rooms: d.rooms.map((r) => (r.id === optionId ? { ...r, revealed: true } : r)),
      ...(count > 1 ? { nextQuestRoomReveals: count - 1 } : {}),
    },
  };
  const continued = beginScoutAheadReveal(next);
  return {
    ...continued,
    events: [
      {
        type: "dungeonUpdated",
        message: `Scout Ahead：房间 ${optionId}已揭示；不清理房间、不抽房间卡、不减少探索骰`,
      },
      ...continued.events,
    ],
  };
}
