import type { ApplyResult, GameState } from "../../command";
import { monsterShuffleResist } from "../../monster-defence";
import { rejectBattleCommand } from "../../battle";
import { advanceAfterRound, finishTurn } from "../../encounter";
import { spawnMonsters, type SpawnPlacement } from "../../spawn";
import { dungeonMonsterPoolThrough } from "../../monster-pool-runtime";
import { resolveWealdSummonAreaPlacement } from "./monster-summon";
import { isLivingCombatMonster } from "./necrotic-fungus";
import { wealdTaskActive } from "./higher-task-effects";

function oakContext(state: GameState): boolean {
  const d = state.dungeon;
  return (
    wealdTaskActive(state, 11) &&
    state.battle?.wealdMechanics === true &&
    d?.rooms.find((r) => r.id === d.position)?.kind === "objective" &&
    d.roomCards?.active?.cardId === "room:weald:05"
  );
}
export function waitingForWealdOak(state: GameState): boolean {
  return (
    oakContext(state) &&
    state.battle?.wealdOakIgnitedRound !== undefined &&
    !state.battle.wealdOakBurnt
  );
}
function ignitionProblem(state: GameState, actorId: string): string | null {
  const b = state.battle,
    turn = b?.encounter?.turn;
  if (
    !oakContext(state) ||
    !b ||
    turn?.type !== "hero" ||
    turn.actorId !== actorId ||
    turn.actions < 1 ||
    turn.mustMove ||
    b.pending ||
    b.shuffleIntents.length ||
    b.shuffleContinuation
  )
    return "点火须在当前英雄可行动的目标房战斗中（R-264）";
  if (
    b.wealdOakIgnitedRound !== undefined ||
    state.dungeon!.wealdBurnedOakRoomIds?.includes(state.dungeon!.position)
  )
    return "本目标橡树已点燃或烧毁";
  if (b.encounter!.round >= 4) return "第4轮不能点火（Weald QUEST p11）";
  const hero = b.entities.find((e) => e.id === actorId && e.side === "hero" && !e.dead);
  if (!hero || !b.areas.find((a) => a.id === hero.areaId)?.poisonousRoots)
    return "英雄须在 B／D／E／G 红星区";
  if (!b.provisions?.some((p) => p.face === "torch")) return "点火需要一枚公共池火把";
  return null;
}
export function readWealdOakAction(state: GameState) {
  const turn = state.battle?.encounter?.turn;
  if (!oakContext(state) || turn?.type !== "hero") return null;
  return {
    command: { type: "igniteWealdOak" as const, actorId: turn.actorId },
    disabledReason: ignitionProblem(state, turn.actorId),
  };
}
export function igniteWealdOak(state: GameState, actorId: string): ApplyResult {
  const problem = ignitionProblem(state, actorId);
  if (problem) return rejectBattleCommand(state, problem);
  const b = state.battle!,
    turn = b.encounter!.turn;
  if (turn.type !== "hero") return rejectBattleCommand(state, "当前不是英雄回合");
  const index = b.provisions!.findIndex((p) => p.face === "torch");
  const next: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...b,
        wealdOakIgnitedRound: b.encounter!.round,
        provisions: b.provisions!.filter((_, i) => i !== index),
        encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions - 1 } },
      },
    },
    events: [
      {
        type: "roomInteractionResolved",
        actorId,
        message: `点燃橡树：本轮末补怪，第${b.encounter!.round + 1}轮末烧毁目标；战斗按实际终局交接（R-264）`,
      },
    ],
  };
  return turn.actions === 1 ? finishTurn(next.state, actorId, next.events) : next;
}

/** 每次摆放复用 R-034 挤占选择；保存队列，恢复时不重复抽牌或结算轮末。 */
function continueRefill(result: ApplyResult, optionId?: string): ApplyResult {
  let next = result;
  for (;;) {
    const b = next.state.battle!,
      info = b.wealdOakRefill!;
    const spawn = info.placements[info.index];
    if (!spawn) {
      const { wealdOakRefill: _done, ...battle } = b;
      void _done;
      return { ...next, state: { ...next.state, battle: { ...battle, pending: null } } };
    }
    const placement = resolveWealdSummonAreaPlacement(
      next.state,
      spawn.areaId,
      spawn.stanceSlots,
      optionId,
    );
    optionId = undefined;
    if ("status" in placement) {
      if (placement.status === "invalid") {
        next = {
          ...next,
          state: {
            ...next.state,
            battle: { ...b, wealdOakRefill: { ...info, index: info.index + 1 } },
          },
        };
        continue;
      }
      if (placement.status === "refused") return rejectBattleCommand(next.state, placement.message);
      const choice = {
        id: `weald-oak-refill:${b.choiceCursor}`,
        prompt: "烧树轮末补怪：选择挤占落点（R-034）",
        options: placement.options,
      };
      return {
        state: {
          ...next.state,
          battle: {
            ...b,
            choiceCursor: b.choiceCursor + 1,
            pending: { type: "wealdOakRefill", choice },
          },
        },
        events: next.events,
        pendingChoice: choice,
      };
    }
    const card = next.state.dungeon!.battleCatalog!.monsters.find((c) => c.id === spawn.cardId);
    if (!card || card.verification.unverified || !Number.isSafeInteger(card.dodge))
      return rejectBattleCommand(next.state, "烧树补怪缺少已核准战斗目录（R-048）");
    next = {
      state: {
        ...next.state,
        battle: {
          ...placement.battle,
          pending: null,
          wealdOakRefill: { ...info, index: info.index + 1 },
          entities: [
            ...placement.battle.entities,
            {
              id: spawn.instanceId,
              side: "monster",
              hero: null,
              monsterCardId: card.id,
              life: card.life,
              dodge: card.dodge,
              stance: spawn.stance,
              stanceSlots: spawn.stanceSlots,
              areaId: placement.areaId,
              wounds: 0,
              skillIds: [],
              guard: false,
              dead: false,
              bleed: [],
              blight: [],
              shuffleResist: monsterShuffleResist(card),
              ...(card.innateProtection === undefined
                ? {}
                : { innateProtection: card.innateProtection, protection: card.innateProtection }),
            },
          ],
        },
      },
      events: [
        ...next.events,
        { type: "dungeonUpdated", message: `烧树轮末生成 ${spawn.instanceId}（R-264）` },
      ],
    };
  }
}
export function endRoundWealdOak(result: ApplyResult): ApplyResult {
  if (!waitingForWealdOak(result.state)) return result;
  const b = result.state.battle!,
    d = result.state.dungeon!,
    round = b.encounter!.round;
  if (round > b.wealdOakIgnitedRound!) {
    return {
      state: {
        ...result.state,
        battle: { ...b, wealdOakBurnt: true },
        dungeon: {
          ...d,
          wealdBurnedOakRoomIds: [...new Set([...(d.wealdBurnedOakRoomIds ?? []), d.position])],
        },
      },
      events: [
        ...result.events,
        {
          type: "dungeonUpdated",
          message: "橡树烧毁，目标已清理；保留剩余怪物并按R25结束战斗（R-264）",
        },
      ],
    };
  }
  const pool = d.monsterPool!,
    catalog = dungeonMonsterPoolThrough(pool, d.explorationSetup!.dungeonLevel);
  if (!pool.active || !pool.remaining || !b.monsterStanceAreas)
    return rejectBattleCommand(result.state, "烧树补怪缺少真实出征牌堆或姿态起点");
  const living: SpawnPlacement[] = b.entities.filter(isLivingCombatMonster).map((e) => {
    const card = catalog.find((c) => c.instanceId === e.id)!;
    return { ...card, stance: e.stance!, areaId: e.areaId };
  });
  if (living.some((m) => !m.instanceId))
    return rejectBattleCommand(result.state, "烧树补怪组件身份不符");
  const areas = b.monsterStanceAreas;
  if (!areas.aggressive || !areas.defensive || !areas.ranged || !areas.support)
    return rejectBattleCommand(result.state, "烧树补怪缺少四姿态起点");
  const starts = {
    aggressive: areas.aggressive,
    defensive: areas.defensive,
    ranged: areas.ranged,
    support: areas.support,
  };
  const spawned = spawnMonsters(
    pool.remaining.map((id) => catalog.find((c) => c.instanceId === id)!),
    starts,
    { initial: living },
  );
  if (spawned.type === "refused") return rejectBattleCommand(result.state, spawned.reason);
  const removed = new Set(spawned.discarded.map((c) => c.instanceId));
  const added = spawned.monsters.filter((m) => !living.some((e) => e.instanceId === m.instanceId));
  const next: ApplyResult = {
    state: {
      ...result.state,
      dungeon: {
        ...d,
        monsterPool: {
          ...pool,
          remaining: spawned.remaining.map((c) => c.instanceId),
          discarded: [...pool.discarded, ...removed],
          active: {
            ...pool.active,
            monsters: [...pool.active.monsters.filter((m) => !removed.has(m.instanceId)), ...added],
          },
        },
      },
      battle: {
        ...b,
        wealdOakRefill: { placements: added, index: 0 },
        entities: b.entities.map((e) => {
          const placement = spawned.monsters.find((m) => m.instanceId === e.id);
          return removed.has(e.id)
            ? { ...e, dead: true }
            : placement
              ? { ...e, stance: placement.stance }
              : e;
        }),
      },
    },
    events: result.events,
  };
  return continueRefill(next);
}
export function chooseWealdOakRefill(state: GameState, optionId: string): ApplyResult {
  if (
    !oakContext(state) ||
    state.battle?.pending?.type !== "wealdOakRefill" ||
    !state.battle.wealdOakRefill
  )
    return rejectBattleCommand(state, "烧树补怪选择已过期");
  return advanceAfterRound(continueRefill({ state, events: [] }, optionId));
}
