import type { ApplyResult, GameEvent, GameState } from "../command";
import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { nextBattleRoll } from "../battle-roll";
import type { SkillStance } from "../hero-skill";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import { readFinalFormSequence } from "./final-form-sequence";

/** boss_ability:p035 · Ancestor 2nd Form 主体。 */
export const ANCESTOR_2_MONSTER_CARD_ID = "monster_large:p018" as const;

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function ancestor2Active(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor2" && sequence.progress.status === "fighting";
}

function livingMonsters(battle: BattleState): BattleEntity[] {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function occupiedMonsterStanceIndexes(battle: BattleState, excludeEntityId?: string): Set<number> {
  const occupied = new Set<number>();
  for (const entity of livingMonsters(battle)) {
    if (excludeEntityId && entity.id === excludeEntityId) continue;
    const start = STANCE_ORDER.indexOf(entity.stance!);
    if (start < 0) continue;
    const width = entity.stanceSlots ?? 1;
    for (let slot = start; slot < start + width; slot += 1) occupied.add(slot);
  }
  return occupied;
}

/** boss_ability:p035 骰面 → 目标姿态（10 为不传送）。 */
export function swiftTeleportStanceFromDie(die: number): SkillStance | null {
  if (die >= 1 && die <= 3) return "defensive";
  if (die >= 4 && die <= 6) return "ranged";
  if (die >= 7 && die <= 9) return "support";
  return null;
}

function canOccupyMonsterStance(
  occupied: Set<number>,
  width: 1 | 2,
  stance: SkillStance,
): boolean {
  const start = STANCE_ORDER.indexOf(stance);
  if (start < 0 || start + width > STANCE_ORDER.length) return false;
  for (let slot = start; slot < start + width; slot += 1) {
    if (occupied.has(slot)) return false;
  }
  return true;
}

function rollSwiftTeleportDie(
  battle: BattleState,
  seed: number,
): { readonly battle: BattleState; readonly die: number; readonly events: readonly GameEvent[] } {
  const die = nextBattleRoll(seed, battle.rngCursor);
  return {
    die,
    battle: { ...battle, rngCursor: battle.rngCursor + 1 },
    events: [
      {
        type: "dungeonUpdated",
        message: `Ancestor 2 · Swift Teleportation：d10=${die}（boss_ability:p035）`,
      },
    ],
  };
}

function applySwiftTeleportToStance(
  battle: BattleState,
  actor: BattleEntity,
  stance: SkillStance,
): { readonly battle: BattleState; readonly moved: boolean; readonly events: readonly GameEvent[] } {
  const width = (actor.stanceSlots ?? 1) as 1 | 2;
  const occupied = occupiedMonsterStanceIndexes(battle, actor.id);
  if (!canOccupyMonsterStance(occupied, width, stance)) {
    return {
      battle,
      moved: false,
      events: [
        {
          type: "dungeonUpdated",
          message: `Ancestor 2 · Swift Teleportation：${stance} 姿态轨无连续空位，不移动（与 Summon 占位规则一致；R-048）`,
        },
      ],
    };
  }
  const areaId = FINAL_BATTLE_MONSTER_STANCE_AREAS[stance];
  const entities = battle.entities.map((entity) =>
    entity.id === actor.id ? { ...entity, stance, areaId } : entity,
  );
  return {
    battle: { ...battle, entities },
    moved: true,
    events: [
      {
        type: "dungeonUpdated",
        message: `Ancestor 2 · Swift Teleportation：${actor.id} → ${stance}（${areaId}；boss_ability:p035）`,
      },
    ],
  };
}

function resolveAncestor2ActorForSwiftTeleport(
  state: GameState,
  actorId: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!ancestor2Active(state))
    return rejectBattleCommand(
      state,
      "Swift Teleportation 仅适用于最终战 Ancestor 2 形态（boss_ability:p035）",
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      "Swift Teleportation 须在 Ancestor 2 怪物行动后执行（boss_ability:p035）",
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== ANCESTOR_2_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Ancestor 2 实体可 Swift Teleportation（R-048）");
  return { battle, actor };
}

function runSwiftTeleportation(
  state: GameState,
  actorId: string,
): ApplyResult {
  const resolved = resolveAncestor2ActorForSwiftTeleport(state, actorId);
  if ("events" in resolved) return resolved;
  const { battle, actor } = resolved;

  const rolled = rollSwiftTeleportDie(battle, state.seed);
  const targetStance = swiftTeleportStanceFromDie(rolled.die);
  if (!targetStance) {
    return {
      state: { ...state, battle: rolled.battle },
      events: [
        ...rolled.events,
        {
          type: "dungeonUpdated",
          message: "Ancestor 2 · Swift Teleportation：10 不传送（boss_ability:p035）",
        },
      ],
    };
  }

  const placed = applySwiftTeleportToStance(rolled.battle, actor, targetStance);
  return {
    state: { ...state, battle: placed.battle },
    events: [...rolled.events, ...placed.events],
  };
}

/**
 * 显式命令：Ancestor 2 结束一次行动后掷 d10 并按 boss_ability:p035 传送（不代替 finishTurn）。
 */
export function applyAncestor2SwiftTeleportation(state: GameState, actorId: string): ApplyResult {
  return runSwiftTeleportation(state, actorId);
}

/** `finishTurn`：Ancestor 2 每次结束行动后落骰并尝试传送（与显式命令共用 RNG 规则）。 */
export function bumpAncestor2SwiftTeleportationAfterAction(
  state: GameState,
  actorId: string,
): GameState {
  if (!ancestor2Active(state)) return state;
  const battle = state.battle;
  if (!battle?.encounter) return state;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.dead ||
    actor.side !== "monster" ||
    actor.monsterCardId !== ANCESTOR_2_MONSTER_CARD_ID
  )
    return state;

  const rolled = rollSwiftTeleportDie(battle, state.seed);
  const targetStance = swiftTeleportStanceFromDie(rolled.die);
  if (!targetStance) return { ...state, battle: rolled.battle };

  const placed = applySwiftTeleportToStance(rolled.battle, actor, targetStance);
  return { ...state, battle: placed.battle };
}

export type ApplyAncestor2SwiftTeleportationCommand = {
  readonly type: "applyAncestor2SwiftTeleportation";
  readonly actorId: string;
};
